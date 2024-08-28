import React, { createContext, useContext, useState, useEffect } from "react";

// Create the authentication context
const AuthContext = createContext(null);

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Store user data
  const [loading, setLoading] = useState(true); // Track loading state (e.g., when checking session)

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
  const login = async (credentials) => {
    // Call your API to authenticate
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
      setLoading(false);
      return userData;
    } else {
      throw new Error("Login failed");
    }
  };

  // Example logout function
  const logout = () => {
    // Perform logout actions, like clearing tokens
    setUser(null);
  };

  // Example function to check if user is authenticated
  const isAuthenticated = () => !!user;

  // Example to check user role or permissions
  const hasRole = (role) => user?.roles?.includes(role);

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
      {children}
    </AuthContext.Provider>
  );
};
