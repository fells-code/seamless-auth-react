export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: './tsconfig.json' }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  // `@seamless-auth/types` publishes ESM with an `import` condition and no
  // `require`, which Jest's CommonJS resolver will not follow. The subpath is
  // mapped directly and exempted from the node_modules transform ignore so
  // ts-jest compiles it. Resolution conditions are deliberately left alone:
  // widening them globally pushes other dependencies onto their ESM builds.
  transformIgnorePatterns: ['node_modules/(?!@seamless-auth/types)'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@seamless-auth/types/role/matching$':
      '<rootDir>/node_modules/@seamless-auth/types/dist/schemas/role/matching.js',
  },
  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).[tj]s?(x)',
    '<rootDir>/src/**/*.(test|spec).[tj]s?(x)',
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
