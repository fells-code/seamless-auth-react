import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Register from "../src/Register";

describe("Register Component", () => {
  it("renders correctly and handles registration", () => {
    const mockOnRegister = jest.fn();
    const mockOnBackToLogin = jest.fn();

    render(
      <Register onRegister={mockOnRegister} onBackToLogin={mockOnBackToLogin} />
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "newuser@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "newpassword" },
    });

    fireEvent.click(screen.getByText(/submit/i));
    expect(mockOnRegister).toHaveBeenCalledWith(
      "newuser@example.com",
      "newpassword"
    );
  });

  it("calls onBackToLogin when back to login button is clicked", () => {
    const mockOnBackToLogin = jest.fn();
    render(
      <Register onRegister={jest.fn()} onBackToLogin={mockOnBackToLogin} />
    );

    fireEvent.click(screen.getByText(/back to login/i));
    expect(mockOnBackToLogin).toHaveBeenCalled();
  });
});
