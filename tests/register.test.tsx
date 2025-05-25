import "@testing-library/jest-dom";

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";

import RegisterPassKey from "../src/RegisterPassKey";

global.fetch = jest.fn();

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("Register Component", () => {
  const mockApiHost = "http://localhost:5000/";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    render(
      <BrowserRouter>
        <RegisterPassKey apiHost={mockApiHost} validateToken={jest.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Register/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByText(/Signup/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Login/i)).toBeInTheDocument();
  });

  // it("handles user input correctly", async () => {
  //   render(
  //     <BrowserRouter
  //       future={{
  //         v7_startTransition: true,
  //         v7_relativeSplatPath: true,
  //       }}
  //     >
  //       <Register apiHost={mockApiHost} />
  //     </BrowserRouter>
  //   );

  //   const emailInput = screen.getByLabelText(/Email/i);
  //   const passwordInput = screen.getByLabelText(/Password/i);

  //   act(() => {
  //     fireEvent.change(emailInput, { target: { value: "test@example.com" } });
  //     fireEvent.change(passwordInput, { target: { value: "password123" } });
  //   });

  //   await waitFor(() => {
  //     expect(emailInput).toHaveValue("test@example.com");
  //     expect(passwordInput).toHaveValue("password123");
  //   });
  // });

  // it("calls the API on form submission", async () => {
  //   (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });

  //   render(
  //     <BrowserRouter
  //       future={{
  //         v7_startTransition: true,
  //         v7_relativeSplatPath: true,
  //       }}
  //     >
  //       <Register apiHost={mockApiHost} />
  //     </BrowserRouter>
  //   );

  //   act(() => {
  //     fireEvent.change(screen.getByLabelText(/Email/i), {
  //       target: { value: "newuser@example.com" },
  //     });
  //     fireEvent.change(screen.getByLabelText(/Password/i), {
  //       target: { value: "newpassword" },
  //     });

  //     fireEvent.click(screen.getByText(/Signup/i));
  //   });

  //   await waitFor(() => {
  //     expect(fetch).toHaveBeenCalledWith(
  //       `${mockApiHost}auth/register`,
  //       expect.objectContaining({
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           email: "newuser@example.com",
  //           password: "newpassword",
  //         }),
  //       })
  //     );
  //   });
  // });

  // it("shows 'An account with this email already exists' when 409 recieved", async () => {
  //   (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 409 });

  //   render(
  //     <BrowserRouter
  //       future={{
  //         v7_startTransition: true,
  //         v7_relativeSplatPath: true,
  //       }}
  //     >
  //       <Register apiHost={mockApiHost} />
  //     </BrowserRouter>
  //   );

  //   fireEvent.change(screen.getByLabelText(/Email/i), {
  //     target: { value: "existinguser@example.com" },
  //   });
  //   fireEvent.change(screen.getByLabelText(/Password/i), {
  //     target: { value: "password123" },
  //   });

  //   await waitFor(() => {
  //     fireEvent.click(screen.getByText(/Signup/i));
  //   });

  //   expect(screen.queryByText(/Email already in use/i)).toBeInTheDocument();
  // });

  // it("shows an error message when registration fails", async () => {
  //   (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });

  //   render(
  //     <BrowserRouter
  //       future={{
  //         v7_startTransition: true,
  //         v7_relativeSplatPath: true,
  //       }}
  //     >
  //       <Register apiHost={mockApiHost} />
  //     </BrowserRouter>
  //   );

  //   fireEvent.change(screen.getByLabelText(/Email/i), {
  //     target: { value: "existinguser@example.com" },
  //   });
  //   fireEvent.change(screen.getByLabelText(/Password/i), {
  //     target: { value: "password123" },
  //   });

  //   await waitFor(() => {
  //     fireEvent.click(screen.getByText(/Signup/i));
  //   });

  //   expect(
  //     screen.queryByText(/Registeration failure occured/i)
  //   ).toBeInTheDocument();
  // });

  // it("catches unexpected registration failures", async () => {
  //   (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

  //   render(
  //     <BrowserRouter
  //       future={{
  //         v7_startTransition: true,
  //         v7_relativeSplatPath: true,
  //       }}
  //     >
  //       <Register apiHost={mockApiHost} />
  //     </BrowserRouter>
  //   );

  //   fireEvent.change(screen.getByLabelText(/Email/i), {
  //     target: { value: "existinguser@example.com" },
  //   });
  //   fireEvent.change(screen.getByLabelText(/Password/i), {
  //     target: { value: "password123" },
  //   });

  //   await waitFor(() => {
  //     fireEvent.click(screen.getByText(/Signup/i));
  //   });

  //   expect(
  //     screen.queryByText(
  //       /An unexpected error occured while attempting to register/i
  //     )
  //   ).toBeInTheDocument();
  // });

  // it("redirects to login when 'Back to Login' is clicked", () => {
  //   render(
  //     <BrowserRouter
  //       future={{
  //         v7_startTransition: true,
  //         v7_relativeSplatPath: true,
  //       }}
  //     >
  //       <Register apiHost={mockApiHost} />
  //     </BrowserRouter>
  //   );

  //   act(() => {
  //     fireEvent.click(screen.getByText(/Back to Login/i));
  //   });

  //   expect(mockNavigate).toHaveBeenCalledWith("/login");
  // });
});
