export const testEnvironment = "jsdom";
export const transform = {
  "^.+\\.tsx?$": "ts-jest",
};
export const moduleFileExtensions = ["ts", "tsx", "js", "jsx", "json", "node"];
export const moduleNameMapper = {
  "\\.(css|less|sass|scss)$": "identity-obj-proxy",
};
export const collectCoverage = true;
export const coverageDirectory = "coverage";
export const coverageReporters = ["json", "lcov", "text", "clover"];
export const collectCoverageFrom = ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"];
export const coverageThreshold = {
  global: {
    branches: 75,
    functions: 75,
    lines: 75,
    statements: 75,
  },
};
