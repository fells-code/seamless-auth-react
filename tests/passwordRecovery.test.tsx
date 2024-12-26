import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PasswordRecovery from "../src/PasswordRecovery";

describe("PasswordRecovery Component", () => {
  it("renders correctly and handles password recovery", () => {
    const mockOnRecover = jest.fn();
    const mockOnBackToLogin = jest.fn();

    render(
      <PasswordRecovery
        onRecover={mockOnRecover}
        onBackToLogin={mockOnBackToLogin}
        error=""
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });

    fireEvent.click(screen.getByText(/Send Recovery Email/i));
    expect(mockOnRecover).toHaveBeenCalledWith("test@example.com");
  });

  it("calls onBackToLogin when back to login button is clicked", () => {
    const mockOnBackToLogin = jest.fn();
    render(
      <PasswordRecovery
        onRecover={jest.fn()}
        onBackToLogin={mockOnBackToLogin}
        error=""
      />
    );

    fireEvent.click(screen.getByText(/back to login/i));
    expect(mockOnBackToLogin).toHaveBeenCalled();
  });
});
