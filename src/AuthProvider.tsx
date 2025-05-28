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

export interface AuthContextType {
  user: { email: string } | null;
  logout: () => void;
  deleteUser: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
  apiHost: string;
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
  const [user, setUser] = useState<{ email: string; roles?: string[] } | null>(
    null
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const validateToken = async () => {
    try {
      const response = await fetchWithAuth(`${apiHost}users/me`, apiHost);

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
        console.error("Error in logout");
      } finally {
        setIsAuthenticated(false);
        setUser(null);
      }
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  };

  const deleteUser = async () => {
    try {
      const response = await fetchWithAuth(`${apiHost}users/delete`, apiHost, {
        method: "delete",
      });

      if (response.ok) {
        setUser(null);
        setIsAuthenticated(false);
        window.location.replace(window.location.origin);
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
      }}
    >
      <InternalAuthProvider value={{ validateToken, setLoading }}>
        {children}
      </InternalAuthProvider>
    </AuthContext.Provider>
  );
};
