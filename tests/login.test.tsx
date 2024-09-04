import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Login from "../src/Login";

describe("Login Component", () => {
  it("renders correctly and handles login", () => {
    const mockOnLogin = jest.fn();
    const mockOnForgotPassword = jest.fn();
    const mockOnRegister = jest.fn();

    render(
      <Login
        onLogin={mockOnLogin}
        onForgotPassword={mockOnForgotPassword}
        onRegister={mockOnRegister}
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(mockOnLogin).toHaveBeenCalledWith("admin", "password");
  });

  it("calls onForgotPassword when forgot password button is clicked", () => {
    const mockOnForgotPassword = jest.fn();
    render(
      <Login
        onLogin={jest.fn()}
        onForgotPassword={mockOnForgotPassword}
        onRegister={jest.fn()}
      />
    );

    fireEvent.click(screen.getByText(/forgot password/i));
    expect(mockOnForgotPassword).toHaveBeenCalled();
  });

  it("calls onRegister when register button is clicked", () => {
    const mockOnRegister = jest.fn();
    render(
      <Login
        onLogin={jest.fn()}
        onForgotPassword={jest.fn()}
        onRegister={mockOnRegister}
      />
    );

    fireEvent.click(screen.getByText(/register/i));
    expect(mockOnRegister).toHaveBeenCalled();
  });
});
