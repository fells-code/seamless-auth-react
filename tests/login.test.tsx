import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../src/Login";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("Login Component", () => {
  const apiHost = "https://example.com/";
  const mockLoginResponse = {
    token: "fakeToken",
    refreshToken: "fakeRefreshToken",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the login form correctly", () => {
    render(
      <MemoryRouter>
        <Login apiHost={apiHost} />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
    expect(screen.getByText(/register/i)).toBeInTheDocument();
  });

  it("updates email and password state on input change", () => {
    render(
      <MemoryRouter>
        <Login apiHost={apiHost} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /password/i
    ) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("password123");
  });

  it("calls login function on form submission", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse),
      })
    ) as jest.Mock;

    render(
      <MemoryRouter>
        <Login apiHost={apiHost} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(localStorage.getItem("authToken")).toBe("fakeToken");
      expect(localStorage.getItem("refreshToken")).toBe("fakeRefreshToken");
    });
  });

  it("displays an error message on failed login", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
      })
    ) as jest.Mock;

    render(
      <MemoryRouter>
        <Login apiHost={apiHost} />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /submit/i });

    fireEvent.change(emailInput, { target: { value: "wrong@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "wrongpassword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/login failed\. try again\./i)
      ).toBeInTheDocument();
    });
  });

  it("navigates to /password when clicking 'Forgot Password?'", () => {
    render(
      <MemoryRouter>
        <Login apiHost={apiHost} />
      </MemoryRouter>
    );

    const forgotPasswordLink = screen.getByText(/forgot password\?/i);
    fireEvent.click(forgotPasswordLink);

    expect(mockNavigate).toHaveBeenCalledWith("/password");
  });

  it("navigates to /register when clicking 'Register'", () => {
    render(
      <MemoryRouter>
        <Login apiHost={apiHost} />
      </MemoryRouter>
    );

    const registerLink = screen.getByText(/register/i);
    fireEvent.click(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith("/register");
  });
});
