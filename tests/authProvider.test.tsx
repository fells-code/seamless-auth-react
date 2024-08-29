import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../src/AuthProvider";

const TestComponent = () => {
  const { user } = useAuth();
  return <div>{user ? `Logged in as ${user.name}` : "Not logged in"}</div>;
};

describe("AuthProvider Component", () => {
  it("renders the login view when not logged in", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it("renders children when logged in", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText(/submit/i);
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });
    fireEvent.click(loginButton);

    expect(screen.getByText(/logged in as admin/i)).toBeInTheDocument();
  });
});
