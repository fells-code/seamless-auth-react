import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "../src/ResetPassword";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("ResetPassword Component", () => {
  const mockApiHost = "http://localhost:5000/";

  beforeEach(() => {
    // @ts-expect-error ignoring
    delete window.location;
    window.location = { search: "?token=test-token" } as Location;

    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ResetPassword apiHost={mockApiHost} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Set New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
  });

  it("enables submit button when passwords match", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ResetPassword apiHost={mockApiHost} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "password123" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit/i })).not.toHaveStyle({
        cursor: "not-allowed",
      });
    });
  });

  it("displays error if passwords do not match", async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ResetPassword apiHost={mockApiHost} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "password456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match./i)).toBeInTheDocument();
    });
  });

  it("submits the form and navigates on success", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
      })
    ) as jest.Mock;

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ResetPassword apiHost={mockApiHost} />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole("button", { name: /submit/i });

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "password123" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit/i })).not.toHaveStyle({
        cursor: "not-allowed",
      });
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiHost}auth/reset-password`,
        expect.objectContaining({
          method: "POST",
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("handles API error and navigates with error state", async () => {
    global.fetch = jest
      .fn()
      .mockImplementation(
        jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock
      );

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ResetPassword apiHost={mockApiHost} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/New Password/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
