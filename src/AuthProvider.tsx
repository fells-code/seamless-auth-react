/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { InternalAuthProvider } from '@/context/InternalAuthContext';
import { startAuthentication } from '@simplewebauthn/browser';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { AuthMode, createFetchWithAuth } from './fetchWithAuth';
import { usePreviousSignIn } from './hooks/usePreviousSignIn';
import {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from '@simplewebauthn/browser';

export interface User {
  id: string;
  email: string;
  phone: string;
  roles?: string[];
}

type AuthToken = {
  oneTimeToken: string;
  expiresAt: string;
};

export interface AuthContextType {
  user: User | null;
  logout: () => void;
  deleteUser: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
  apiHost: string;
  token: AuthToken | null;
  markSignedIn: () => void;
  hasSignedInBefore: boolean;
  mode: AuthMode;
  credentials: Credential[];
  updateCredential: (credential: Credential) => Promise<Credential>;
  deleteCredential: (credentialId: string) => Promise<void>;
  login: (identifier: string, passkeyAvailable: boolean) => Promise<Response | null>;
  handlePasskeyLogin: () => Promise<boolean>;
  loading: boolean;
}

export interface Credential {
  id: string;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedup: boolean;
  friendlyName: string | null;
  lastUsedAt: Date | null;
  platform: string | null;
  browser: string | null;
  deviceInfo: string | null;
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
  mode?: AuthMode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
  autoDetectPreviousSignin = true,
  mode = 'web',
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<AuthToken | null>(null);
  const { hasSignedInBefore, markSignedIn } = usePreviousSignIn();
  const [authMode] = useState<AuthMode>(mode);

  const fetchWithAuth = createFetchWithAuth({
    authMode,
    authHost: apiHost,
  });

  const login = async (
    identifier: string,
    passkeyAvailable: boolean
  ): Promise<Response | null> => {
    try {
      const response = await fetchWithAuth(`/login`, {
        method: 'POST',
        body: JSON.stringify({ identifier, passkeyAvailable }),
      });
      return response;
    } catch (error) {
      console.error('Error fetching,', error);
      return null;
    }
  };

  const handlePasskeyLogin = async () => {
    try {
      const response = await fetchWithAuth(`/webAuthn/login/start`, {
        method: 'POST',
      });

      const options = await response.json();
      const credential = await startAuthentication({ optionsJSON: options });

      const verificationResponse = await fetchWithAuth(`/webAuthn/login/finish`, {
        method: 'POST',
        body: JSON.stringify({ assertionResponse: credential }),
      });

      if (!verificationResponse.ok) {
        console.error('Failed to verify passkey');
      }

      const verificationResult = await verificationResponse.json();

      if (verificationResult.message === 'Success') {
        if (verificationResult.mfaLogin) {
          return true;
        }
        await validateToken();
        return false;
      } else {
        console.error('Passkey login failed:', verificationResult.message);
        return false;
      }
    } catch (error) {
      console.error('Passkey login error:', error);
      return false;
    }
  };

  const logout = useCallback(async () => {
    if (user) {
      try {
        await fetchWithAuth(`/logout`, {
          method: 'GET',
        });
      } catch {
        console.error('Error during logout');
      } finally {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    }
  }, [fetchWithAuth, user]);

  const deleteUser = async () => {
    try {
      const response = await fetchWithAuth(`/users/delete`, {
        method: 'delete',
      });

      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        return;
      } else {
        throw new Error('Could not delete user.');
      }
    } catch (error) {
      console.error('Something went wrong deleting user:', error);
      throw new Error('Could not delete user.');
    }
  };

  const hasRole = (role: string) => user?.roles?.includes(role);

  const validateToken = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`users/me`, {
        method: 'GET',
      });

      if (response.ok) {
        const { user, credentials } = await response.json();
        setUser(user);
        setCredentials(credentials);

        setIsAuthenticated(true);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const updateCredential = async (credential: Credential) => {
    const response = await fetchWithAuth(`users/credentials`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendlyName: credential.friendlyName, id: credential.id }),
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error('Failed to update credential');
  };

  const deleteCredential = async (credentialId: string) => {
    const response = await fetchWithAuth(`users/credentials`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: credentialId }),
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error('Failed to update credential');
  };

  useEffect(() => {
    validateToken();
  }, []);

  useEffect(() => {
    if (user && isAuthenticated) {
      markSignedIn();
    }
  }, [user, isAuthenticated, markSignedIn]);

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        loading,
        deleteUser,
        isAuthenticated,
        hasRole,
        apiHost,
        token,
        markSignedIn,
        hasSignedInBefore: autoDetectPreviousSignin ? hasSignedInBefore : false,
        mode,
        credentials,
        updateCredential,
        deleteCredential,
        login,
        handlePasskeyLogin,
      }}
    >
      <InternalAuthProvider value={{ validateToken, setLoading }}>
        {children}
      </InternalAuthProvider>
    </AuthContext.Provider>
  );
};
