/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import { createSeamlessAuthClient } from '@/client/createSeamlessAuthClient';
import { Credential, User } from '@/types';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { AuthMode } from './fetchWithAuth';
import { usePreviousSignIn } from './hooks/usePreviousSignIn';

export interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  deleteUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
  apiHost: string;
  markSignedIn: () => void;
  hasSignedInBefore: boolean;
  mode: AuthMode;
  credentials: Credential[];
  updateCredential: (credential: Credential) => Promise<Credential>;
  deleteCredential: (credentialId: string) => Promise<void>;
  login: (identifier: string, passkeyAvailable: boolean) => Promise<Response>;
  handlePasskeyLogin: () => Promise<boolean>;
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
  const { hasSignedInBefore, markSignedIn } = usePreviousSignIn();
  const authMode = mode;

  const authClient = useMemo(
    () =>
      createSeamlessAuthClient({
        mode: authMode,
        apiHost,
      }),
    [authMode, apiHost]
  );

  const login = async (
    identifier: string,
    passkeyAvailable: boolean
  ): Promise<Response> => {
    return authClient.login({ identifier, passkeyAvailable });
  };

  const handlePasskeyLogin = async () => {
    const result = await authClient.loginWithPasskey();

    if (result.mfaRequired) {
      console.warn(
        'Passkey login requested MFA, but the built-in MFA route is not currently available.'
      );
      return false;
    }

    if (result.success) {
      await validateToken();
      return true;
    }

    console.error('Passkey login failed:', result.message);
    return false;
  };

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } catch {
      console.error('Error during logout');
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setCredentials([]);
    }
  }, [authClient]);

  const deleteUser = async () => {
    try {
      const response = await authClient.deleteUser();

      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        setCredentials([]);
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

  const validateToken = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authClient.getCurrentUser();

      if (response.ok) {
        const { user, credentials } = await response.json();
        setUser(user);
        setCredentials(credentials ?? []);

        setIsAuthenticated(true);
      } else {
        await logout();
      }
    } catch {
      await logout();
    } finally {
      setLoading(false);
    }
  }, [authClient, logout]);

  const updateCredential = async (credential: Credential) => {
    const response = await authClient.updateCredential({
      friendlyName: credential.friendlyName,
      id: credential.id,
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error('Failed to update credential');
  };

  const deleteCredential = async (credentialId: string) => {
    const response = await authClient.deleteCredential(credentialId);

    if (response.ok) {
      return response.json();
    }

    throw new Error('Failed to update credential');
  };

  useEffect(() => {
    void validateToken();
  }, [validateToken]);

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
        refreshSession: validateToken,
        loading,
        deleteUser,
        isAuthenticated,
        hasRole,
        apiHost,
        markSignedIn,
        hasSignedInBefore: autoDetectPreviousSignin ? hasSignedInBefore : false,
        mode: authMode,
        credentials,
        updateCredential,
        deleteCredential,
        login,
        handlePasskeyLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
