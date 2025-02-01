import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PasswordRecovery from "../src/PasswordRecovery";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("PasswordRecovery Component", () => {
  const apiHost = "https://example.com/";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the password recovery form correctly", () => {
    render(
      <MemoryRouter>
        <PasswordRecovery apiHost={apiHost} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send recovery email/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/back to login/i)).toBeInTheDocument();
  });

  it("updates email state on input change", () => {
    render(
      <MemoryRouter>
        <PasswordRecovery apiHost={apiHost} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    expect(emailInput.value).toBe("test@example.com");
  });

  it("calls recoverPassword function on form submission", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as jest.Mock;

    window.alert = jest.fn(); // Mock alert

    render(
      <MemoryRouter>
        <PasswordRecovery apiHost={apiHost} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send recovery email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiHost}auth/forgot-password`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "test@example.com" }),
        })
      );

      expect(window.alert).toHaveBeenCalledWith("Password reset email sent.");
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("handles API errors gracefully", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("Network Error"))
    ) as jest.Mock;

    jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <PasswordRecovery apiHost={apiHost} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send recovery email/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to send password reset email:",
        expect.any(Error)
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("navigates to /login when clicking 'Back to Login'", () => {
    render(
      <MemoryRouter>
        <PasswordRecovery apiHost={apiHost} />
      </MemoryRouter>
    );

    const backButton = screen.getByText(/back to login/i);
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
