import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { fetchWithAuth } from "./fetchWithAuth";
import Login from "./Login";
import Register from "./Register";
import PasswordRecovery from "./PasswordRecovery";
import ResetPassword from "./ResetPassword";
import "./index.css";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
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
    } catch (error) {
      console.error("Error validating token:", error);
      logout();
    }
  };

  useEffect(() => {
    const authToken = localStorage.getItem("authToken");

    if (authToken) {
      validateToken();
    }
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
      } catch (error) {
        console.error("Error in logout", error);
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
        window.location.replace(window.location.origin);
      } else {
        throw new Error("Could not delete user.");
      }
    } catch (error) {
      console.error("Something went wrong deleting user:", error);
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
      }}
    >
      <Router
        future={{
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {isAuthenticated ? (
            <Route path="*" element={children} />
          ) : (
            <>
              <Route path="/login" element={<Login apiHost={apiHost} />} />
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
                element={<VerifyAccount apiHost={apiHost} />}
              />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
};
