/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createSeamlessAuthClient,
  FinishOAuthLoginInput,
  OAuthProvidersResult,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpWithPasskeyPrfResult,
  StepUpStatus,
  StepUpVerificationResult,
} from '@/client/createSeamlessAuthClient';
import { PasskeyPrfInput } from '@/client/webauthnPrf';
import { Credential, Organization, User } from '@/types';
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
  organizations: Organization[];
  activeOrganization: Organization | null;
  switchOrganization: (organizationId: string) => Promise<void>;
  listOAuthProviders: () => Promise<OAuthProvidersResult>;
  startOAuthLogin: (input: StartOAuthLoginInput) => Promise<StartOAuthLoginResult>;
  finishOAuthLogin: (input: FinishOAuthLoginInput) => Promise<void>;
  stepUpStatus: StepUpStatus | null;
  updateCredential: (credential: Credential) => Promise<Credential>;
  deleteCredential: (credentialId: string) => Promise<void>;
  login: (identifier: string, passkeyAvailable: boolean) => Promise<Response | null>;
  handlePasskeyLogin: () => Promise<boolean>;
  refreshStepUpStatus: () => Promise<StepUpStatus | null>;
  verifyStepUpWithPasskey: () => Promise<StepUpVerificationResult>;
  verifyStepUpWithPasskeyPrf: (
    input: PasskeyPrfInput
  ) => Promise<StepUpWithPasskeyPrfResult>;
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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [stepUpStatus, setStepUpStatus] = useState<StepUpStatus | null>(null);
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
      setOrganizations([]);
      setActiveOrganization(null);
      setStepUpStatus(null);
    }
  }, [authClient]);

  const deleteUser = async () => {
    try {
      const response = await authClient.deleteUser();

      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        setCredentials([]);
        setOrganizations([]);
        setActiveOrganization(null);
        setStepUpStatus(null);
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
        const { user, credentials, organizations, activeOrganization } =
          await response.json();
        setUser(user);
        setCredentials(credentials ?? []);
        setOrganizations(organizations ?? []);
        setActiveOrganization(activeOrganization ?? null);

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
      const responseBody = await response.json();
      const updatedCredential = responseBody.credential ?? responseBody;

      setCredentials(currentCredentials =>
        currentCredentials.map(currentCredential =>
          currentCredential.id === updatedCredential.id
            ? { ...currentCredential, ...updatedCredential }
            : currentCredential
        )
      );

      return responseBody;
    }

    throw new Error('Failed to update credential');
  };

  const deleteCredential = async (credentialId: string) => {
    const response = await authClient.deleteCredential(credentialId);

    if (response.ok) {
      const responseBody = await response.json();
      setCredentials(currentCredentials =>
        currentCredentials.filter(credential => credential.id !== credentialId)
      );
      return responseBody;
    }

    throw new Error('Failed to delete credential');
  };

  const switchOrganization = async (organizationId: string) => {
    const response = await authClient.switchOrganization(organizationId);

    if (!response.ok) {
      throw new Error('Failed to switch organization');
    }

    await validateToken();
  };

  const listOAuthProviders = () => authClient.listOAuthProviders();

  const startOAuthLogin = (input: StartOAuthLoginInput) =>
    authClient.startOAuthLogin(input);

  const finishOAuthLogin = async (input: FinishOAuthLoginInput) => {
    const response = await authClient.finishOAuthLogin(input);

    if (!response.ok) {
      throw new Error('Failed to finish OAuth login');
    }

    await validateToken();
  };

  const refreshStepUpStatus = useCallback(async () => {
    const response = await authClient.getStepUpStatus();

    if (!response.ok) {
      setStepUpStatus(null);
      return null;
    }

    const status = (await response.json()) as StepUpStatus;
    setStepUpStatus(status);
    return status;
  }, [authClient]);

  const verifyStepUpWithPasskey = useCallback(async () => {
    const result = await authClient.verifyStepUpWithPasskey();

    if (result.success) {
      setStepUpStatus({
        fresh: result.fresh,
        method: result.method,
        verifiedAt: result.verifiedAt,
        expiresAt: result.expiresAt,
        maxAgeSeconds: result.maxAgeSeconds,
      });
    }

    return result;
  }, [authClient]);

  const verifyStepUpWithPasskeyPrf = useCallback(
    async (input: PasskeyPrfInput) => {
      const result = await authClient.verifyStepUpWithPasskeyPrf(input);

      if (result.success) {
        setStepUpStatus({
          fresh: result.fresh,
          method: result.method,
          verifiedAt: result.verifiedAt,
          expiresAt: result.expiresAt,
          maxAgeSeconds: result.maxAgeSeconds,
        });
      }

      return result;
    },
    [authClient]
  );

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
        organizations,
        activeOrganization,
        switchOrganization,
        listOAuthProviders,
        startOAuthLogin,
        finishOAuthLogin,
        stepUpStatus,
        updateCredential,
        deleteCredential,
        login,
        handlePasskeyLogin,
        refreshStepUpStatus,
        verifyStepUpWithPasskey,
        verifyStepUpWithPasskeyPrf,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
