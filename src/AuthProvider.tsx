import "./index.css";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { fetchWithAuth } from "./fetchWithAuth";
import LoadingSpinner from "./LoadingSpinner";
import Login from "./Login";
import PasswordRecovery from "./PasswordRecovery";
import Register from "./Register";
import ResetPassword from "./ResetPassword";
import VerifyAccount from "./VerifyAccount";

interface AuthContextType {
  user: { email: string } | null;
  logout: () => void;
  deleteUser: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Returns the current context
 * @returns AuthContext
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

  // TODO: Think about making this a hook?
  const validateToken = async () => {
    try {
      const response = await fetchWithAuth(`${apiHost}auth/user`, apiHost);

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
      const response = await fetchWithAuth(`${apiHost}auth/delete`, apiHost, {
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
      }}
    >
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {isAuthenticated ? (
            <Route path="*" element={children} />
          ) : (
            <>
              <Route
                path="/login"
                element={<Login setLoading={setLoading} apiHost={apiHost} />}
              />
              <Route
                path="/register"
                element={<Register apiHost={apiHost} />}
              />
              <Route
                path="/password"
                element={<PasswordRecovery apiHost={apiHost} />}
              />
              <Route
                path="/reset-password"
                element={<ResetPassword apiHost={apiHost} />}
              />
              <Route
                path="/verify"
                element={
                  <VerifyAccount
                    setLoading={setLoading}
                    apiHost={apiHost}
                    validateToken={validateToken}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};
