import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Login from "./Login";
import Register from "./Register";
import PasswordRecovery from "./PasswordRecovery";

import "./index.css";

interface AuthContextType {
  user: { name: string } | null;
  login: (username: string, password: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

enum AuthView {
  LOGIN = "LOGIN",
  REGISTER = "REGISTER",
  RECOVER = "RECOVER",
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

  const validateToken = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const response = await fetch(`${apiHost}api/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 403) {
          localStorage.removeItem("authToken");
        }

        const result = await response.json();
        setUser(result);
      }
    } catch (error) {
      console.error("Error retrieving user information:", error);
      localStorage.removeItem("authToken");
    }
  };

  useEffect(() => {
    validateToken();
  }, [apiHost]);

  // Example login function
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
        throw new Error(`Response status: ${response.status}`);
      }

      const result = await response.json();

      localStorage.setItem("authToken", result.token);
      validateToken();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("authToken");
  };

  const register = async (email: string, password: string) => {
    try {
      // await axios.post("/register", { email, password });
      // Optionally, you can auto-login after registration
    } catch (error) {
      console.error("Registration failed", error);
    }
  };

  const recoverPassword = (email: string) => {
    // Implement your password recovery logic here
    alert(`Password recovery email sent to: ${email}`);
    setCurrentView(AuthView.LOGIN);
  };

  const hasRole = (role: string) => user?.roles?.includes(role);

  const renderView = () => {
    switch (currentView) {
      case AuthView.LOGIN:
        return (
          <Login
            onLogin={login}
            onForgotPassword={() => setCurrentView(AuthView.RECOVER)}
            onRegister={() => setCurrentView(AuthView.REGISTER)}
          />
        );
      case AuthView.RECOVER:
        return (
          <PasswordRecovery
            onRecover={recoverPassword}
            onBackToLogin={() => setCurrentView(AuthView.LOGIN)}
          />
        );
      case AuthView.REGISTER:
        return (
          <Register
            onRegister={register}
            onBackToLogin={() => setCurrentView(AuthView.LOGIN)}
          />
        );
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
        isAuthenticated,
        hasRole,
      }}
    >
      {!user ? renderView() : children}
    </AuthContext.Provider>
  );
};
