import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/AuthProvider";
import { fetchWithAuth } from "../src/fetchWithAuth";

// Mock fetch responses
global.fetch = jest.fn();
jest.mock("../src/fetchWithAuth");

const mockApiHost = "https://example.com/";

const MockChildComponent = () => {
  const { user, isAuthenticated, logout, hasRole, deleteUser } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p data-testid="user-email">{user?.email}</p>
          <button onClick={logout}>Logout</button>
          <button onClick={deleteUser}>Delete User</button>
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

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
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

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
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

  it("logs out the user and clears tokens even if an error is thrown", async () => {
    localStorage.setItem("authToken", "valid-token");

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ email: "user@example.com" }),
    });
    (fetch as jest.Mock).mockRejectedValue(new Error("Bad things"));

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

    (fetchWithAuth as jest.Mock).mockResolvedValueOnce({ ok: false });

    render(
      <AuthProvider apiHost={mockApiHost}>
        <MockChildComponent />
      </AuthProvider>
    );

    await waitFor(() => expect(localStorage.getItem("authToken")).toBeNull());
  });

  it("throws error when used outside an AuthProvider", async () => {
    expect(() => render(<MockChildComponent />)).toThrow(
      "useAuth must be used within an AuthProvider"
    );
  });
});
