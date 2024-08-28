import { useAuth } from "../src/index";

test("useAuth should be a function", () => {
  expect(typeof useAuth).toBe("function");
});
