/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createSeamlessAuthClient,
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
} from '../client/createSeamlessAuthClient';
import type { SeamlessAuthResult } from '../client/result';
import { PasskeyPrfInput } from '../client/webauthnPrf';
import { hasScopedRole as rolesGrantScopedAccess } from '../scopedRoles';
import { Credential, Organization, User } from '../types';
import { createDefaultStorage, SessionStoragePort } from './storage';

const PREVIOUS_SIGN_IN_KEY = 'seamlessauth_seen';

/** Everything a UI binding renders from. Replaced wholesale on every change. */
export interface AuthSessionState {
  user: User | null;
  credentials: Credential[];
  organizations: Organization[];
  activeOrganization: Organization | null;
  stepUpStatus: StepUpStatus | null;
  isAuthenticated: boolean;
  loading: boolean;
  hasSignedInBefore: boolean;
}

export interface AuthSessionActions {
  login: (
    identifier: string,
    passkeyAvailable: boolean
  ) => Promise<SeamlessAuthResult<LoginStartResult>>;
  handlePasskeyLogin: () => Promise<SeamlessAuthResult<PasskeyLoginData>>;
  refreshSession: () => Promise<SeamlessAuthResult<CurrentUserResult>>;
  logout: () => Promise<SeamlessAuthResult<MessageResult>>;
  logoutAllSessions: () => Promise<SeamlessAuthResult<MessageResult>>;
  deleteUser: () => Promise<SeamlessAuthResult<MessageResult>>;
  updateCredential: (credential: Credential) => Promise<SeamlessAuthResult<Credential>>;
  deleteCredential: (credentialId: string) => Promise<SeamlessAuthResult<MessageResult>>;
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
  refreshStepUpStatus: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskey: () => Promise<SeamlessAuthResult<StepUpStatus>>;
  verifyStepUpWithPasskeyPrf: (
    input: PasskeyPrfInput
  ) => Promise<SeamlessAuthResult<StepUpPrfData>>;
  verifyStepUpWithTotp: (code: string) => Promise<SeamlessAuthResult<StepUpStatus>>;
  hasRole: (role: string) => boolean | undefined;
  hasScopedRole: (role: string | string[]) => boolean | undefined;
  markSignedIn: () => void;
}

/**
 * Framework-agnostic session store.
 *
 * `getState` and `subscribe` are the shape React's `useSyncExternalStore` wants,
 * and they adapt directly to a Vue ref or an Angular observable, so bindings stay
 * thin instead of each reimplementing this state machine.
 */
export interface AuthSession {
  getState: () => AuthSessionState;
  subscribe: (listener: () => void) => () => void;
  actions: AuthSessionActions;
  destroy: () => void;
}

export interface AuthSessionOptions {
  apiHost: string;
  storage?: SessionStoragePort;
  /**
   * When false, a previous sign-in is still recorded but never surfaced, so a UI
   * cannot branch on it.
   */
  detectPreviousSignIn?: boolean;
}

const SIGNED_OUT = {
  user: null,
  credentials: [],
  organizations: [],
  activeOrganization: null,
  stepUpStatus: null,
  isAuthenticated: false,
} satisfies Partial<AuthSessionState>;

export function createAuthSession(options: AuthSessionOptions): AuthSession {
  const { apiHost, detectPreviousSignIn = true } = options;
  const client = createSeamlessAuthClient({ apiHost });
  const storage = options.storage ?? createDefaultStorage();
  const listeners = new Set<() => void>();

  let destroyed = false;
  // Guards against a slow earlier session read overwriting a newer one, which
  // React's batching used to hide.
  let refreshGeneration = 0;

  let state: AuthSessionState = {
    ...SIGNED_OUT,
    loading: true,
    hasSignedInBefore:
      detectPreviousSignIn && storage.get(PREVIOUS_SIGN_IN_KEY) === 'true',
  };

  /**
   * `getState` has to return the same reference until something actually
   * changes, otherwise `useSyncExternalStore` re-renders forever.
   */
  function setState(patch: Partial<AuthSessionState>) {
    const next = { ...state, ...patch };
    const changed = (Object.keys(patch) as (keyof AuthSessionState)[]).some(
      key => state[key] !== next[key]
    );

    if (!changed) {
      return;
    }

    state = next;
    listeners.forEach(listener => listener());
  }

  function markSignedIn() {
    storage.set(PREVIOUS_SIGN_IN_KEY, 'true');

    if (detectPreviousSignIn) {
      setState({ hasSignedInBefore: true });
    }
  }

  /** Drop local session state without calling the server. */
  function clearSession() {
    setState(SIGNED_OUT);
  }

  async function logout() {
    // The client reports failures through its result, so there is nothing to
    // catch. The finally is deliberate: local auth state has to be cleared even
    // when the server call fails, otherwise the UI keeps presenting a signed-in
    // user whose session is already gone.
    try {
      return await client.logout();
    } finally {
      clearSession();
    }
  }

  async function logoutAllSessions() {
    try {
      return await client.logoutAllSessions();
    } finally {
      clearSession();
    }
  }

  async function refreshSession() {
    const generation = ++refreshGeneration;

    setState({ loading: true });

    const result = await client.getCurrentUser();

    if (destroyed || generation !== refreshGeneration) {
      return result;
    }

    if (result.error) {
      // The session is unusable, so it is dropped locally. Calling the logout
      // endpoint here would fire a request for a session the server has already
      // rejected, on every anonymous page load.
      clearSession();
      setState({ loading: false });

      return result;
    }

    setState({
      user: result.data.user,
      credentials: result.data.credentials ?? [],
      organizations: result.data.organizations ?? [],
      activeOrganization: result.data.activeOrganization ?? null,
      isAuthenticated: true,
      loading: false,
    });

    if (!state.hasSignedInBefore) {
      markSignedIn();
    }

    return result;
  }

  async function refreshAfter<T>(
    run: () => Promise<SeamlessAuthResult<T>>
  ): Promise<SeamlessAuthResult<T>> {
    const result = await run();

    if (!result.error) {
      await refreshSession();
    }

    return result;
  }

  const actions: AuthSessionActions = {
    login: (identifier, passkeyAvailable) =>
      client.login({ identifier, passkeyAvailable }),

    handlePasskeyLogin: () => refreshAfter(() => client.loginWithPasskey()),

    refreshSession,
    logout,
    logoutAllSessions,

    deleteUser: async () => {
      const result = await client.deleteUser();

      if (!result.error) {
        clearSession();
      }

      return result;
    },

    updateCredential: async credential => {
      const { data, error } = await client.updateCredential({
        // The wire type leaves the name optional, and the update endpoint reads
        // null as "clear it", so an absent name is sent as an explicit null.
        friendlyName: credential.friendlyName ?? null,
        id: credential.id,
      });

      if (error) {
        return { data: null, error };
      }

      const updated = data.credential;

      setState({
        credentials: state.credentials.map(current =>
          current.id === updated.id ? { ...current, ...updated } : current
        ),
      });

      // Callers get the credential itself rather than the response wrapper.
      return { data: updated, error: null };
    },

    deleteCredential: async credentialId => {
      const result = await client.deleteCredential(credentialId);

      if (!result.error) {
        setState({
          credentials: state.credentials.filter(
            credential => credential.id !== credentialId
          ),
        });
      }

      return result;
    },

    switchOrganization: organizationId =>
      refreshAfter(() => client.switchOrganization(organizationId)),

    listOAuthProviders: () => client.listOAuthProviders(),
    startOAuthLogin: input => client.startOAuthLogin(input),
    finishOAuthLogin: input => refreshAfter(() => client.finishOAuthLogin(input)),

    refreshStepUpStatus: async () => {
      const result = await client.getStepUpStatus();

      // A status that cannot be read is not a stale status: it is no status.
      setState({ stepUpStatus: result.error ? null : result.data });

      return result;
    },

    verifyStepUpWithPasskey: async () => {
      const result = await client.verifyStepUpWithPasskey();

      if (!result.error) {
        setState({ stepUpStatus: result.data });
      }

      return result;
    },

    verifyStepUpWithPasskeyPrf: async input => {
      const result = await client.verifyStepUpWithPasskeyPrf(input);

      if (!result.error) {
        setState({
          stepUpStatus: {
            fresh: result.data.fresh,
            method: result.data.method,
            verifiedAt: result.data.verifiedAt,
            expiresAt: result.data.expiresAt,
            maxAgeSeconds: result.data.maxAgeSeconds,
          },
        });
      }

      return result;
    },

    verifyStepUpWithTotp: async code => {
      const result = await client.verifyStepUpWithTotp(code);

      if (!result.error) {
        setState({ stepUpStatus: result.data });
      }

      return result;
    },

    hasRole: role => state.user?.roles?.includes(role),
    hasScopedRole: role =>
      state.user ? rolesGrantScopedAccess(state.user.roles, role) : undefined,

    markSignedIn,
  };

  return {
    getState: () => state,
    subscribe: listener => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    actions,
    destroy: () => {
      destroyed = true;
      listeners.clear();
    },
  };
}
