import { InternalAuthProvider } from "context/InternalAuthContext";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { fetchWithAuth } from "./fetchWithAuth";
import LoadingSpinner from "./LoadingSpinner";

interface User {
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Returns the current context
 * @returns {AuthContextType} AuthContext
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  apiHost: string;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  apiHost,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<AuthToken | null>(null);

  const validateToken = async () => {
    try {
      const response = await fetchWithAuth(`${apiHost}users/me`);

      if (response.ok) {
        const { user, token } = await response.json();
        setUser(user);
        setIsAuthenticated(true);
        setToken(token);
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
    validateToken();
    setLoading(false);
  }, []);

  const logout = async () => {
    if (user) {
      try {
        await fetch(`${apiHost}auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: user.email,
          }),
          credentials: "include",
        });
      } catch {
        console.error("Error during logout");
      } finally {
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    }
  };

  const deleteUser = async () => {
    try {
      const response = await fetchWithAuth(`${apiHost}users/delete`, {
        method: "delete",
        credentials: "include",
      });

      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        return;
      } else {
        throw new Error("Could not delete user.");
      }
    } catch (error) {
      console.error("Something went wrong deleting user:", error);
      throw new Error("Could not delete user.");
    }
  };

  const hasRole = (role: string) => user?.roles?.includes(role);

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
      }}
    >
      <InternalAuthProvider value={{ validateToken, setLoading }}>
        {children}
      </InternalAuthProvider>
    </AuthContext.Provider>
  );
};
