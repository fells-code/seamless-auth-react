/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  CurrentUserResult,
  FinishOAuthLoginInput,
  LoginStartResult,
  MessageResult,
  OAuthProvidersResult,
  OrganizationSwitchResult,
  PasskeyLoginData,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpPrfData,
  StepUpStatus,
} from '@/client/createSeamlessAuthClient';
import type { SeamlessAuthResult } from '@/client/result';
import { PasskeyPrfInput } from '@/client/webauthnPrf';
import { createAuthSession } from '@/session/createAuthSession';
import { Credential, Organization, User } from '@/types';
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
  ) => Promise<SeamlessAuthResult<MessageResult>>;
  stepUpStatus: StepUpStatus | null;
  updateCredential: (credential: Credential) => Promise<SeamlessAuthResult<Credential>>;
  deleteCredential: (credentialId: string) => Promise<SeamlessAuthResult<MessageResult>>;
  login: (
    identifier: string,
    passkeyAvailable: boolean
  ) => Promise<SeamlessAuthResult<LoginStartResult>>;
  handlePasskeyLogin: () => Promise<SeamlessAuthResult<PasskeyLoginData>>;
  refreshStepUpStatus: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskey: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskeyPrf: (
    input: PasskeyPrfInput
  ) => Promise<SeamlessAuthResult<StepUpPrfData>>;
  verifyStepUpWithTotp: (code: string) => Promise<SeamlessAuthResult<StepUpStatus>>;
  loading: boolean;
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
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
  autoDetectPreviousSignin = true,
}) => {
  const session = useMemo(
    () =>
      createAuthSession({
        apiHost,
        detectPreviousSignIn: autoDetectPreviousSignin,
      }),
    [apiHost, autoDetectPreviousSignin]
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
    () => ({ ...state, ...session.actions, apiHost }),
    [state, session, apiHost]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
