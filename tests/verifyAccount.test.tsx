// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VerifyAccount from "../src/VerifyAccount";

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("VerifyAccount", () => {
  const apiHost = "http://localhost:5000/";

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch.mockReset();
    window.history.pushState({}, "", "/verify?token=test-token");
  });

  it("sends verification request and stores tokens on success", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        token: "auth-token",
        refreshToken: "refresh-token",
      }),
    });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <VerifyAccount apiHost={apiHost} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiHost}auth/verify`,
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ verificationToken: "test-token" }),
        })
      );
    });

    expect(localStorage.getItem("authToken")).toBe("auth-token");
    expect(localStorage.getItem("refreshToken")).toBe("refresh-token");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("redirects to login with an error message if verification fails", async () => {
    global.fetch.mockResolvedValue({ ok: false });

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <VerifyAccount apiHost={apiHost} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/login",
        expect.objectContaining({
          state: expect.objectContaining({
            error: expect.stringContaining(
              "An error occured validating your token"
            ),
          }),
        })
      );
    });
  });

  it("redirects to login with an error if no token is provided", async () => {
    window.history.pushState({}, "", "/verify"); // No token in URL

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <VerifyAccount apiHost={apiHost} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/login",
        expect.objectContaining({
          state: expect.objectContaining({
            error: expect.stringContaining("Token is invalid or missing"),
          }),
        })
      );
    });
  });

  it("redirects to login with an error if fetch throws an error", async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <VerifyAccount apiHost={apiHost} />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/login",
        expect.objectContaining({
          state: expect.objectContaining({
            error: expect.stringContaining("An unexpected error occured"),
          }),
        })
      );
    });
  });
});
