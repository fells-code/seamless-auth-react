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
    const result = await authClient.loginWithPasskey();

    if (!result.error) {
      await validateToken();
    }

    return result;
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
    // The client reports failures through its result, so there is nothing to
    // catch. The finally is deliberate: local auth state has to be cleared even
    // when the server call fails, otherwise the UI keeps presenting a signed-in
    // user whose session is already gone.
    try {
      return await authClient.logout();
    } finally {
      resetAuthState();
    }
  }, [authClient, resetAuthState]);

  const logoutAllSessions = useCallback(async () => {
    // The client reports failures through its result, so there is nothing to
    // catch. The finally is deliberate: local auth state has to be cleared even
    // when the server call fails, otherwise the UI keeps presenting a signed-in
    // user whose session is already gone.
    try {
      return await authClient.logoutAllSessions();
    } finally {
      resetAuthState();
    }
  }, [authClient, resetAuthState]);

  const deleteUser = async () => {
    const result = await authClient.deleteUser();

    if (!result.error) {
      resetAuthState();
    }

    return result;
  };

  const hasRole = (role: string) => user?.roles?.includes(role);
  const hasScopedRole = (role: string | string[]) =>
    user ? rolesGrantScopedAccess(user.roles, role) : undefined;

  const validateToken = useCallback(async () => {
    setLoading(true);

    const result = await authClient.getCurrentUser();

    if (result.error) {
      // An unusable session is cleared rather than left half-applied.
      await logout();
      setLoading(false);
      return result;
    }

    setUser(result.data.user);
    setCredentials(result.data.credentials ?? []);
    setOrganizations(result.data.organizations ?? []);
    setActiveOrganization(result.data.activeOrganization ?? null);
    setIsAuthenticated(true);
    setLoading(false);

    return result;
  }, [authClient, logout]);

  const updateCredential = async (credential: Credential) => {
    const { data, error } = await authClient.updateCredential({
      friendlyName: credential.friendlyName,
      id: credential.id,
    });

    if (error) {
      return { data: null, error };
    }

    const updatedCredential = data.credential;

    setCredentials(currentCredentials =>
      currentCredentials.map(currentCredential =>
        currentCredential.id === updatedCredential.id
          ? { ...currentCredential, ...updatedCredential }
          : currentCredential
      )
    );

    return { data: updatedCredential, error: null };
  };

  const deleteCredential = async (credentialId: string) => {
    const result = await authClient.deleteCredential(credentialId);

    if (!result.error) {
      setCredentials(currentCredentials =>
        currentCredentials.filter(credential => credential.id !== credentialId)
      );
    }

    return result;
  };

  const switchOrganization = async (organizationId: string) => {
    const result = await authClient.switchOrganization(organizationId);

    if (!result.error) {
      await validateToken();
    }

    return result;
  };

  const listOAuthProviders = () => authClient.listOAuthProviders();

  const startOAuthLogin = (input: StartOAuthLoginInput) =>
    authClient.startOAuthLogin(input);

  const finishOAuthLogin = async (input: FinishOAuthLoginInput) => {
    const result = await authClient.finishOAuthLogin(input);

    if (!result.error) {
      await validateToken();
    }

    return result;
  };

  const refreshStepUpStatus = useCallback(async () => {
    const result = await authClient.getStepUpStatus();

    setStepUpStatus(result.error ? null : result.data);

    return result;
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
        setStepUpStatus({
          fresh: result.data.fresh,
          method: result.data.method,
          verifiedAt: result.data.verifiedAt,
          expiresAt: result.data.expiresAt,
          maxAgeSeconds: result.data.maxAgeSeconds,
        });
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
