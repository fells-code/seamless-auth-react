/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  CurrentUserResult,
  FinishOAuthLoginInput,
  FinishOAuthLoginResult,
  LoginStartResult,
  MessageResult,
  OAuthProvidersResult,
  OrganizationSwitchResult,
  PasskeyLoginData,
  PasskeyMetadata,
  PasskeyRegistrationData,
  RegisterPasskeyOptions,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpPrfData,
  StepUpStatus,
} from '@seamless-auth/client';
import type { SeamlessAuthResult } from '@seamless-auth/client';
import { PasskeyPrfInput } from '@seamless-auth/client';
import {
  createAuthSession,
  createBrowserOAuthRedirect,
  createBrowserPasskeyPort,
  type OAuthRedirectPort,
  type PasskeyPort,
  type SeamlessAuthClient,
  type TransportOptions,
} from '@seamless-auth/client';
import { Credential, Organization, User } from '@seamless-auth/client';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

export interface AuthContextType {
  user: User | null;
  logout: () => Promise<SeamlessAuthResult<MessageResult>>;
  logoutAllSessions: () => Promise<SeamlessAuthResult<MessageResult>>;
  deleteUser: () => Promise<SeamlessAuthResult<MessageResult>>;
  refreshSession: () => Promise<SeamlessAuthResult<CurrentUserResult>>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
  hasScopedRole: (role: string | string[]) => boolean | undefined;
  apiHost: string;
  magicLinkRedirectUri?: string;
  markSignedIn: () => void;
  hasSignedInBefore: boolean;
  credentials: Credential[];
  organizations: Organization[];
  activeOrganization: Organization | null;
  switchOrganization: (
    organizationId: string
  ) => Promise<SeamlessAuthResult<OrganizationSwitchResult>>;
  listOAuthProviders: () => Promise<SeamlessAuthResult<OAuthProvidersResult>>;
  startOAuthLogin: (
    input: StartOAuthLoginInput
  ) => Promise<SeamlessAuthResult<StartOAuthLoginResult>>;
  finishOAuthLogin: (
    input: FinishOAuthLoginInput
  ) => Promise<SeamlessAuthResult<FinishOAuthLoginResult>>;
  stepUpStatus: StepUpStatus | null;
  updateCredential: (credential: Credential) => Promise<SeamlessAuthResult<Credential>>;
  deleteCredential: (credentialId: string) => Promise<SeamlessAuthResult<MessageResult>>;
  login: (
    identifier: string,
    passkeyAvailable: boolean
  ) => Promise<SeamlessAuthResult<LoginStartResult>>;
  handlePasskeyLogin: () => Promise<SeamlessAuthResult<PasskeyLoginData>>;
  registerPasskey: (
    input: PasskeyMetadata | RegisterPasskeyOptions
  ) => Promise<SeamlessAuthResult<PasskeyRegistrationData>>;
  refreshStepUpStatus: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskey: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskeyPrf: (
    input: PasskeyPrfInput
  ) => Promise<SeamlessAuthResult<StepUpPrfData>>;
  verifyStepUpWithTotp: (code: string) => Promise<SeamlessAuthResult<StepUpStatus>>;
  loading: boolean;
  /** The client behind the session. `useAuthClient()` returns this same instance. */
  client: SeamlessAuthClient;
  /** The platform ports the built-in screens and hooks go through. */
  ports: AuthPorts;
}

/**
 * What a binding plugs in for its platform. The browser defaults cover a web
 * application; a native binding supplies its own.
 */
export interface AuthPorts {
  passkeys: PasskeyPort;
  oauthRedirect: OAuthRedirectPort;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Returns the current context
 * @returns {AuthContextType} AuthContext
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  apiHost: string;
  autoDetectPreviousSignin?: boolean;
  /**
   * Where a magic link sent by the bundled screens should land. Both the first
   * send and a resend read it from here, so the two cannot drift apart.
   */
  magicLinkRedirectUri?: string;
  /**
   * How the session travels to the server adapter. Defaults to cookie
   * transport, which is what a browser application wants.
   */
  transport?: Omit<TransportOptions, 'apiHost'>;
  /** Platform ports. Each one left out falls back to the browser's. */
  ports?: Partial<AuthPorts>;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
  autoDetectPreviousSignin = true,
  magicLinkRedirectUri,
  transport,
  ports: providedPorts,
}) => {
  // Memoised on what is inside the objects, not on the objects. Callers write
  // these props inline, and a fresh session per render would sign the user out
  // on every paint.
  const ports = useMemo<AuthPorts>(
    () => ({
      passkeys: providedPorts?.passkeys ?? createBrowserPasskeyPort(),
      oauthRedirect: providedPorts?.oauthRedirect ?? createBrowserOAuthRedirect(),
    }),
    [providedPorts?.passkeys, providedPorts?.oauthRedirect]
  );

  const { mode, basePath, tokenStorage, fetch: fetchImpl } = transport ?? {};
  const stableTransport = useMemo(
    () => (transport ? { mode, basePath, tokenStorage, fetch: fetchImpl } : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `transport` itself is deliberately not a dependency
    [mode, basePath, tokenStorage, fetchImpl]
  );

  const session = useMemo(
    () =>
      createAuthSession({
        apiHost,
        magicLinkRedirectUri,
        transport: stableTransport,
        passkeys: ports.passkeys,
        detectPreviousSignIn: autoDetectPreviousSignin,
      }),
    [
      apiHost,
      magicLinkRedirectUri,
      stableTransport,
      ports.passkeys,
      autoDetectPreviousSignin,
    ]
  );

  // The store is the source of truth; React only reads snapshots from it. The
  // server snapshot is the same call because the store reaches browser storage
  // through a port that falls back to memory when there is none.
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState
  );

  // The store is deliberately not destroyed on cleanup. `destroy()` is terminal,
  // and React may run mount, cleanup, mount against the same memoized store:
  // StrictMode does it on every mount today, and Activity will do it whenever a
  // tree is hidden and shown again. Tearing down here left the remounted provider
  // holding a store that refuses updates, stuck on `loading: true` forever.
  //
  // Nothing leaks by skipping it. `useSyncExternalStore` removes its own listener
  // when the provider unmounts, and the store owns no timers or subscriptions, so
  // it is reclaimed with the component. A refresh still in flight then resolves
  // into a store nobody observes. `destroy()` stays on the store for bindings that
  // genuinely own its lifetime.
  useEffect(() => {
    void session.actions.refreshSession();
  }, [session]);

  const value = useMemo(
    () => ({
      ...state,
      ...session.actions,
      apiHost,
      magicLinkRedirectUri,
      client: session.client,
      ports,
    }),
    [state, session, apiHost, magicLinkRedirectUri, ports]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
