export default {
  projects: [
    '<rootDir>/packages/client',
    '<rootDir>/packages/react',
    '<rootDir>/packages/react-native',
  ],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov'],
};
