import React, { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/AuthProvider";

// Mock components
jest.mock("../src/Login", () => ({
  __esModule: true,
  default: ({ onLogin, onForgotPassword, onRegister }: any) => (
    <div>
      <button onClick={() => onLogin("testuser", "password")}>Login</button>
      <button onClick={onForgotPassword}>Forgot Password</button>
      <button onClick={onRegister}>Register</button>
    </div>
  ),
}));

jest.mock("../src/Register", () => ({
  __esModule: true,
  default: ({ onRegister, onBackToLogin }: any) => (
    <div>
      <button onClick={() => onRegister("testuser", "password")}>
        Register
      </button>
      <button onClick={onBackToLogin}>Back to Login</button>
    </div>
  ),
}));

jest.mock("../src/PasswordRecovery", () => ({
  __esModule: true,
  default: ({ onRecover, onBackToLogin }: any) => (
    <div>
      <button onClick={() => onRecover("testuser@example.com")}>
        Recover Password
      </button>
      <button onClick={onBackToLogin}>Back to Login</button>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe("AuthProvider", () => {
  const apiHost = "http://localhost:3000/";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const TestComponent = () => {
    const { user, login, logout, isAuthenticated, hasRole } = useAuth();

    return (
      <div>
        <div>{isAuthenticated ? "Authenticated" : "Not Authenticated"}</div>
        <div>{user ? `User: ${user.email}` : "No User"}</div>
        <button onClick={() => login("testuser", "password")}>
          Test Login
        </button>
        <button onClick={logout}>Test Logout</button>
        {hasRole && (
          <div>{hasRole("admin") ? "Has Admin Role" : "No Admin Role"}</div>
        )}
      </div>
    );
  };

  it("renders the login view by default", () => {
    render(
      <AuthProvider apiHost={apiHost}>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText("Login")).toBeTruthy();
  });
});
