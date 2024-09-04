import { useAuth, AuthProvider } from "../src/index";

test("useAuth should be a function", () => {
  expect(typeof useAuth).toBe("function");
});

test("AuthProvider is a component", () => {
  expect(typeof AuthProvider).toBe("function");
});
