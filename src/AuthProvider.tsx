/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

import {
  createSeamlessAuthClient,
  FinishOAuthLoginInput,
  LoginStartResult,
  OAuthProvidersResult,
  StartOAuthLoginInput,
  StartOAuthLoginResult,
  StepUpPrfData,
  StepUpStatus,
} from '@/client/createSeamlessAuthClient';
import type { SeamlessAuthResult } from '@/client/result';
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

import { usePreviousSignIn } from './hooks/usePreviousSignIn';
import { hasScopedRole as rolesGrantScopedAccess } from './scopedRoles';

export interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  logoutAllSessions: () => Promise<void>;
  deleteUser: () => Promise<void>;
  refreshSession: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
  hasScopedRole: (role: string | string[]) => boolean | undefined;
  apiHost: string;
  markSignedIn: () => void;
  hasSignedInBefore: boolean;
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
  login: (
    identifier: string,
    passkeyAvailable: boolean
  ) => Promise<SeamlessAuthResult<LoginStartResult>>;
  handlePasskeyLogin: () => Promise<boolean>;
  refreshStepUpStatus: () => Promise<StepUpStatus | null>;
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
  const [user, setUser] = useState<User | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);
  const [stepUpStatus, setStepUpStatus] = useState<StepUpStatus | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const { hasSignedInBefore, markSignedIn } = usePreviousSignIn();

  const authClient = useMemo(
    () =>
      createSeamlessAuthClient({
        apiHost,
      }),
    [apiHost]
  );

  const login = (identifier: string, passkeyAvailable: boolean) =>
    authClient.login({ identifier, passkeyAvailable });

  const handlePasskeyLogin = async () => {
    const { error } = await authClient.loginWithPasskey();

    if (error) {
      console.error('Passkey login failed.');
      return false;
    }

    await validateToken();
    return true;
  };

  const resetAuthState = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setCredentials([]);
    setOrganizations([]);
    setActiveOrganization(null);
    setStepUpStatus(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } catch {
      console.error('Error during logout');
    } finally {
      resetAuthState();
    }
  }, [authClient, resetAuthState]);

  const logoutAllSessions = useCallback(async () => {
    try {
      await authClient.logoutAllSessions();
    } catch {
      console.error('Error during logout');
    } finally {
      resetAuthState();
    }
  }, [authClient, resetAuthState]);

  const deleteUser = async () => {
    const { error } = await authClient.deleteUser();

    if (error) {
      console.error('Something went wrong deleting user.');
      throw error;
    }

    resetAuthState();
  };

  const hasRole = (role: string) => user?.roles?.includes(role);
  const hasScopedRole = (role: string | string[]) =>
    user ? rolesGrantScopedAccess(user.roles, role) : undefined;

  const validateToken = useCallback(async () => {
    setLoading(true);

    const { data, error } = await authClient.getCurrentUser();

    if (error) {
      await logout();
      setLoading(false);
      return;
    }

    setUser(data.user);
    setCredentials(data.credentials ?? []);
    setOrganizations(data.organizations ?? []);
    setActiveOrganization(data.activeOrganization ?? null);
    setIsAuthenticated(true);
    setLoading(false);
  }, [authClient, logout]);

  const updateCredential = async (credential: Credential) => {
    const { data, error } = await authClient.updateCredential({
      friendlyName: credential.friendlyName,
      id: credential.id,
    });

    if (error) {
      throw error;
    }

    // Older responses return the credential at the top level.
    const updatedCredential = (data.credential ?? data) as Credential;

    setCredentials(currentCredentials =>
      currentCredentials.map(currentCredential =>
        currentCredential.id === updatedCredential.id
          ? { ...currentCredential, ...updatedCredential }
          : currentCredential
      )
    );

    return data as unknown as Credential;
  };

  const deleteCredential = async (credentialId: string) => {
    const { error } = await authClient.deleteCredential(credentialId);

    if (error) {
      throw error;
    }

    setCredentials(currentCredentials =>
      currentCredentials.filter(credential => credential.id !== credentialId)
    );
  };

  const switchOrganization = async (organizationId: string) => {
    const { error } = await authClient.switchOrganization(organizationId);

    if (error) {
      throw error;
    }

    await validateToken();
  };

  const listOAuthProviders = async () => {
    const { data, error } = await authClient.listOAuthProviders();

    if (error) {
      throw error;
    }

    return data;
  };

  const startOAuthLogin = async (input: StartOAuthLoginInput) => {
    const { data, error } = await authClient.startOAuthLogin(input);

    if (error) {
      throw error;
    }

    return data;
  };

  const finishOAuthLogin = async (input: FinishOAuthLoginInput) => {
    const { error } = await authClient.finishOAuthLogin(input);

    if (error) {
      throw error;
    }

    await validateToken();
  };

  const refreshStepUpStatus = useCallback(async () => {
    const { data, error } = await authClient.getStepUpStatus();

    if (error) {
      setStepUpStatus(null);
      return null;
    }

    setStepUpStatus(data);
    return data;
  }, [authClient]);

  const verifyStepUpWithPasskey = useCallback(async () => {
    const result = await authClient.verifyStepUpWithPasskey();

    if (!result.error) {
      setStepUpStatus(result.data);
    }

    return result;
  }, [authClient]);

  const verifyStepUpWithPasskeyPrf = useCallback(
    async (input: PasskeyPrfInput) => {
      const result = await authClient.verifyStepUpWithPasskeyPrf(input);

      if (!result.error) {
        const { credentialId: _credentialId, prf: _prf, ...status } = result.data;
        setStepUpStatus(status);
      }

      return result;
    },
    [authClient]
  );

  const verifyStepUpWithTotp = useCallback(
    async (code: string) => {
      const result = await authClient.verifyStepUpWithTotp(code);

      if (!result.error) {
        setStepUpStatus(result.data);
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
        logoutAllSessions,
        refreshSession: validateToken,
        loading,
        deleteUser,
        isAuthenticated,
        hasRole,
        hasScopedRole,
        apiHost,
        markSignedIn,
        hasSignedInBefore: autoDetectPreviousSignin ? hasSignedInBefore : false,
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
        verifyStepUpWithTotp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
