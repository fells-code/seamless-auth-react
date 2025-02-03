import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoadingSpinner from "../src/LoadingSpinner";

describe("Login Component", () => {
  it("renders the login form correctly", () => {
    render(
      <MemoryRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <LoadingSpinner />
      </MemoryRouter>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });
});
