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

interface AuthContextType {
  user: { name: string } | null;
  login: (username: string, password: string) => void;
  logout: () => void;
  loading: boolean;
  isAuthenticated: () => boolean;
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
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<{ name: string; roles: string[] } | null>(
    null
  );
  const [currentView, setCurrentView] = useState<AuthView>(AuthView.LOGIN);
  const [loading, setLoading] = useState<boolean>(true);

  // useEffect(() => {
  //   const checkSession = async () => {
  //     try {
  //       const response = await fetch("/api/check-session");
  //       if (response.ok) {
  //         const userData = await response.json();
  //         setUser(userData);
  //       }
  //     } catch (error) {
  //       console.error("Failed to check session:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   checkSession();
  // }, []);

  // Example login function
  const login = async (username: string, password: string) => {
    if (username === "admin" && password === "password") {
      setUser({ name: "Admin", roles: ["admin"] });
    } else {
      alert("Invalid credentials");
    }

    // const response = await fetch("/api/login", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify(credentials),
    // });

    // if (response.ok) {
    //   const userData = await response.json();
    //   setUser(userData);
    //   setLoading(false);
    //   return userData;
    // } else {
    //   throw new Error("Login failed");
    // }
  };

  const logout = () => {
    // Perform logout actions, like clearing tokens
    setUser(null);
  };

  const register = (username: string, email: string, password: string) => {
    // Implement your registration logic here
    alert(`Registered user: ${username} with email: ${email}`);
    setCurrentView(AuthView.LOGIN);
  };

  const recoverPassword = (email: string) => {
    // Implement your password recovery logic here
    alert(`Password recovery email sent to: ${email}`);
    setCurrentView(AuthView.LOGIN);
  };

  const isAuthenticated = () => !!user;

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
        loading,
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
