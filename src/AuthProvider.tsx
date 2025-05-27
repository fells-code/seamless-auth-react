import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { fetchWithAuth } from "./fetchWithAuth";

interface AuthContextType {
  user: { email: string; roles?: string[] } | null;
  logout: () => void;
  deleteUser: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
  validateToken: () => Promise<void>;
  setLoading: (state: boolean) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children?: ReactNode;
  apiHost: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
}) => {
  const [user, setUser] = useState<{ email: string; roles?: string[] } | null>(
    null
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const normalizeHost = (host: string) =>
    host.endsWith("/") ? host : `${host}/`;

  const normalizedHost = normalizeHost(apiHost);

  const validateToken = async () => {
    try {
      const response = await fetchWithAuth(
        `${normalizedHost}users/me`,
        apiHost
      );

      if (response.ok) {
        const user = await response.json();
        setUser(user);
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

  useEffect(() => {
    let isMounted = true;

    validateToken().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = async () => {
    if (user) {
      try {
        await fetch(`${normalizedHost}auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
      } catch {
        console.error("Error in logout");
      } finally {
        setIsAuthenticated(false);
        setUser(null);
      }
    }
  };

  const deleteUser = async () => {
    try {
      const response = await fetchWithAuth(
        `${normalizedHost}users/delete`,
        apiHost,
        {
          method: "delete",
        }
      );

      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        window.location.replace(window.location.origin);
      } else {
        throw new Error("Could not delete user.");
      }
    } catch (error) {
      console.error("Something went wrong deleting user:", error);
      throw error;
    }
  };

  const hasRole = (role: string) => user?.roles?.includes(role);

  return (
    <AuthContext.Provider
      value={{
        user,
        logout,
        deleteUser,
        isAuthenticated,
        hasRole,
        validateToken,
        setLoading,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
