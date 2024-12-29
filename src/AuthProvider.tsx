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

import "./index.css";
import ResetPassword from "./ResetPassword";

interface AuthContextType {
  user: { name: string } | null;
  login: (username: string, password: string) => void;
  logout: () => void;
  deleteUser: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

enum AuthView {
  LOGIN = "LOGIN",
  REGISTER = "REGISTER",
  RECOVER = "RECOVER",
  RESET = "RESET",
}

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
  const [user, setUser] = useState<{ name: string; roles: string[] } | null>(
    null
  );
  const [currentView, setCurrentView] = useState<AuthView>(AuthView.LOGIN);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const validateToken = async () => {
    try {
      const response = await fetchWithAuth(`${apiHost}api/auth/user`, apiHost);

      if (response.ok) {
        const user = await response.json();
        setUser(user);
      } else {
        throw new Error("Token validation failed");
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
  }, [apiHost]);

  useEffect(() => {
    const route = window.location.pathname;

    if (route === "/reset-password" || route === "/verify") {
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);

      if (urlParams.get("token")) {
        if (route === "/reset-password") {
          setResetToken(urlParams.get("token"));
        }

        if (route === "/verify") {
          verify(urlParams.get("token"));
        }
        // TODO: Clear the path and query items after everything is complete
        //window.location.replace(window.location.origin);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiHost}api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (!response.ok) {
        setError("Incorrect username or password");
        return;
      }

      const result = await response.json();

      localStorage.setItem("authToken", result.token);
      localStorage.setItem("refreshToken", result.refreshToken);
      validateToken();
    } catch (error) {
      console.error("Login failed", error);
      logout();
    }
  };

  const logout = async () => {
    if (user) {
      await fetch(`${apiHost}api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.name,
        }),
      });
    }

    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiHost}api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      if (response.status === 409) {
        setError(
          "An account with this email already exists. Please log in or use a different email."
        );
        return;
      }

      if (!response.ok) {
        setError("An error occured.");
        return;
      }
    } catch (error) {
      console.error("Registration failed", error);
      setError("An error occured.");
    }
  };

  const verify = async (verificationToken: string | null) => {
    try {
      const result = await fetch(`${apiHost}api/auth/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verificationToken }),
      });

      if (!result.ok) {
        setError("Verification failed.");
        // TODO: Do I need to do this?
        window.location.replace(window.location.origin);
      }
    } catch (error) {
      console.error("Failed to verify user:", error);
      setError("Verification failed.");
    }
  };

  const recoverPassword = async (email: string) => {
    try {
      await fetch(`${apiHost}api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      alert("Password reset email sent.");
    } catch (error) {
      console.error("Failed to send password reset email:", error);
    }
    setCurrentView(AuthView.LOGIN);
  };

  const resetPassword = async (password: string) => {
    try {
      await fetch(`${apiHost}api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resetToken, password }),
      });
      alert("Password has been reset.");
      setCurrentView(AuthView.LOGIN);
    } catch (error) {
      console.error("Failed to reset password:", error);
    }
  };

  const deleteUser = async () => {
    try {
      const response = await fetchWithAuth(
        `${apiHost}api/auth/delete`,
        apiHost,
        {
          method: "delete",
        }
      );

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

  const renderView = () => {
    switch (currentView) {
      case AuthView.LOGIN:
        return (
          <Login
            onLogin={login}
            onForgotPassword={() => setCurrentView(AuthView.RECOVER)}
            onRegister={() => {
              setError("");
              setCurrentView(AuthView.REGISTER);
            }}
            error={error}
          />
        );
      case AuthView.RECOVER:
        return (
          <PasswordRecovery
            onRecover={recoverPassword}
            onBackToLogin={() => setCurrentView(AuthView.LOGIN)}
            error={error}
          />
        );
      case AuthView.REGISTER:
        return (
          <Register
            onRegister={register}
            onBackToLogin={() => {
              setCurrentView(AuthView.LOGIN);
              setError("");
            }}
            error={error}
          />
        );
      case AuthView.RESET:
        return <ResetPassword onResetPassword={resetPassword} error={error} />;

      default:
        return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        deleteUser,
        isAuthenticated,
        hasRole,
      }}
    >
      {!user ? renderView() : children}
    </AuthContext.Provider>
  );
};
