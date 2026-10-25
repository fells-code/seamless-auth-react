/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
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
  RecoverySessionResult,
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
  type InitialSession,
  type RefreshSessionOptions,
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
  useRef,
  useSyncExternalStore,
} from 'react';

export interface AuthContextType {
  user: User | null;
  logout: () => Promise<SeamlessAuthResult<MessageResult>>;
  logoutAllSessions: () => Promise<SeamlessAuthResult<MessageResult>>;
  deleteUser: () => Promise<SeamlessAuthResult<MessageResult>>;
  refreshSession: (
    options?: RefreshSessionOptions
  ) => Promise<SeamlessAuthResult<CurrentUserResult>>;
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
  /**
   * True while the session is a recovery session, which can only enroll a passkey
   * or authenticator app. Enrolling one through `registerPasskey` lifts it.
   */
  recoverySession: boolean;
  /** Signs in with a recovery code, on the sign-in `login` started. */
  redeemRecoveryCode: (
    code: string
  ) => Promise<SeamlessAuthResult<RecoverySessionResult>>;
  /** Completes an account recovery whose waiting period has passed. */
  completeAccountRecovery: () => Promise<SeamlessAuthResult<RecoverySessionResult>>;
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
   * Where the adapter is mounted, the fetch to use, and the extra origins
   * `authorizedFetch` may reach. Always cookie transport: the server adapter
   * holds the tokens and the browser only HttpOnly cookies, so a script on the
   * page can ride the session but never read it. Bearer transport is for
   * native apps, through `@seamless-auth/react-native`.
   */
  transport?: Omit<TransportOptions, 'apiHost' | 'mode' | 'tokenStorage'>;
  /** Platform ports. Each one left out falls back to the browser's. */
  ports?: Partial<AuthPorts>;
  /**
   * The session a server already resolved for this request, or `null` when it
   * found none. The first paint renders it settled instead of loading, and the
   * provider then revalidates in the background, which fills in credentials and
   * organizations and catches a session the server could not see. Read once,
   * when the session is created.
   */
  initialSession?: InitialSession | null;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
  autoDetectPreviousSignin = true,
  magicLinkRedirectUri,
  transport,
  ports: providedPorts,
  initialSession,
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

  // The type no longer offers bearer, but a JavaScript caller can still pass it,
  // and quietly switching it to cookies would hide that their tokens were never
  // where they thought.
  if ((transport as { mode?: unknown } | undefined)?.mode === 'bearer') {
    throw new TypeError(
      '@seamless-auth/react is cookie transport only, so the browser never holds the tokens. Use @seamless-auth/react-native for bearer transport in a native app.'
    );
  }

  const { basePath, fetch: fetchImpl, trustedOrigins } = transport ?? {};
  // An inline array is a new value on every render, so it is compared by content.
  const trustedOriginsKey = trustedOrigins ? JSON.stringify(trustedOrigins) : undefined;
  const stableTransport = useMemo(
    () =>
      transport
        ? {
            mode: 'cookie' as const,
            basePath,
            fetch: fetchImpl,
            trustedOrigins: trustedOriginsKey
              ? (JSON.parse(trustedOriginsKey) as string[])
              : undefined,
          }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `transport` itself is deliberately not a dependency
    [basePath, fetchImpl, trustedOriginsKey]
  );

  // Seeds the store like a `useState` initialiser. A server component hands over
  // a fresh object on every `router.refresh()`, and rebuilding the store for each
  // one would reset a sign-in that is half way through.
  const initialSessionRef = useRef(initialSession);

  const session = useMemo(
    () =>
      createAuthSession({
        apiHost,
        magicLinkRedirectUri,
        transport: stableTransport,
        passkeys: ports.passkeys,
        detectPreviousSignIn: autoDetectPreviousSignin,
        initialSession: initialSessionRef.current,
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
  // server snapshot leaves out what only the browser knows, so hydration renders
  // exactly what the server did and picks up the rest straight after.
  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getServerState
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
    void session.actions.refreshSession({
      background: initialSessionRef.current !== undefined,
    });
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
