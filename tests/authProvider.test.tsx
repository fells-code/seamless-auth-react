import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/AuthProvider";

// Mock fetch responses
global.fetch = jest.fn();

const mockApiHost = "https://example.com/";

const MockChildComponent = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p data-testid="user-email">{user?.email}</p>
          <button onClick={logout}>Logout</button>
          <p data-testid="role-check">{hasRole("admin") ? "Admin" : "User"}</p>
        </>
      ) : (
        <p data-testid="unauthenticated">Not Authenticated</p>
      )}
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("renders the login page when unauthenticated", () => {
    render(
      <AuthProvider apiHost={mockApiHost}>
        <MockChildComponent />
      </AuthProvider>
    );

    expect(screen.getByText(/Login/i)).toBeInTheDocument();
  });

  it("validates token and sets user on mount if token exists", async () => {
    localStorage.setItem("authToken", "valid-token");

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: "user@example.com", roles: ["admin"] }),
    });

    render(
      <AuthProvider apiHost={mockApiHost}>
        <MockChildComponent />
      </AuthProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("user-email")).toHaveTextContent(
        "user@example.com"
      )
    );
    expect(screen.getByTestId("role-check")).toHaveTextContent("Admin");
  });

  it("logs out the user and clears tokens", async () => {
    localStorage.setItem("authToken", "valid-token");

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: "user@example.com" }),
    });

    render(
      <AuthProvider apiHost={mockApiHost}>
        <MockChildComponent />
      </AuthProvider>
    );

    await waitFor(() => screen.getByTestId("user-email"));

    fireEvent.click(screen.getByText(/logout/i));

    await waitFor(() => expect(localStorage.getItem("authToken")).toBeNull());
  });

  it("handles invalid tokens by logging out", async () => {
    localStorage.setItem("authToken", "invalid-token");

    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(
      <AuthProvider apiHost={mockApiHost}>
        <MockChildComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(localStorage.getItem("authToken")).toBeNull());
  });
});
