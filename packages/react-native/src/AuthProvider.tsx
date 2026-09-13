/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createAuthSession,
  createMemoryTokenStorage,
  type AuthSessionActions,
  type AuthSessionState,
  type OAuthRedirectPort,
  type PasskeyPort,
  type SeamlessAuthClient,
  type TokenStoragePort,
} from '@seamless-auth/client';
import React, {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

/**
 * What a React Native application plugs in for its platform. Unlike the web
 * binding there are no defaults here: a native app has no browser to fall back
 * to, and each port wraps a native module the app chose to install.
 */
export interface NativeAuthPorts {
  passkeys: PasskeyPort;
  oauthRedirect?: OAuthRedirectPort;
  /** Where the session lives between launches. Defaults to memory, which signs out on restart. */
  tokenStorage?: TokenStoragePort;
}

export interface AuthContextType extends AuthSessionState, AuthSessionActions {
  apiHost: string;
  magicLinkRedirectUri?: string;
  /** The client behind the session. `useAuthClient()` returns this same instance. */
  client: SeamlessAuthClient;
  ports: NativeAuthPorts;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export interface AuthProviderProps {
  children: ReactNode;
  /** The origin the server adapter is reachable at, for example `https://api.example.com`. */
  apiHost: string;
  /** Where the adapter is mounted on that origin. Defaults to `/auth`. */
  basePath?: string;
  /** Where a magic link should land, when the deployment allows the app to choose. */
  magicLinkRedirectUri?: string;
  ports: NativeAuthPorts;
  /** The fetch to use, for tests and instrumented builds. Defaults to the global one. */
  fetch?: typeof fetch;
}

/**
 * The session for a React Native application, always over bearer transport:
 * the client holds the auth API's tokens, presents the right one on each
 * request, stores the pair through `ports.tokenStorage`, and refreshes
 * through `POST /refresh` when the access token expires.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
  basePath,
  magicLinkRedirectUri,
  ports,
  fetch: fetchImpl,
}) => {
  const { passkeys, oauthRedirect, tokenStorage } = ports;

  const session = useMemo(
    () =>
      createAuthSession({
        apiHost,
        magicLinkRedirectUri,
        passkeys,
        transport: {
          mode: 'bearer',
          basePath,
          tokenStorage: tokenStorage ?? createMemoryTokenStorage(),
          fetch: fetchImpl,
        },
        // There is no "seen before" flag on native: the keystore holding a
        // session is the signal, and it is read by the transport itself.
        detectPreviousSignIn: false,
      }),
    [apiHost, basePath, magicLinkRedirectUri, passkeys, tokenStorage, fetchImpl]
  );

  const state = useSyncExternalStore(
    session.subscribe,
    session.getState,
    session.getState
  );

  // Not destroyed on cleanup, for the reason the web binding gives: React may
  // mount, clean up, and mount the same memoised store again, and a destroyed
  // store refuses updates.
  useEffect(() => {
    void session.actions.refreshSession();
  }, [session]);

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      ...session.actions,
      apiHost,
      magicLinkRedirectUri,
      client: session.client,
      ports: { passkeys, oauthRedirect, tokenStorage },
    }),
    [state, session, apiHost, magicLinkRedirectUri, passkeys, oauthRedirect, tokenStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
