export default {
  projects: [
    '<rootDir>/packages/client',
    '<rootDir>/packages/react',
    '<rootDir>/packages/react-native',
    '<rootDir>/packages/angular',
    '<rootDir>/packages/vue',
  ],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'routes/src/**/*.ts', '!src/**/*.d.ts'],
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
