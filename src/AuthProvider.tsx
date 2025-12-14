import { InternalAuthProvider } from '@/context/InternalAuthContext';
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { AuthMode, createFetchWithAuth } from './fetchWithAuth';
import LoadingSpinner from './LoadingSpinner';
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <LoadingSpinner />;
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
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
      }}
    >
      <InternalAuthProvider value={{ validateToken, setLoading }}>
        {children}
      </InternalAuthProvider>
    </AuthContext.Provider>
  );
};
