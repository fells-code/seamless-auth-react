/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

export default {
  displayName: 'vue',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  // Vue's test utilities resolve the browser build only with this condition.
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@shared-styles/seamless-auth\\.css$': '<rootDir>/tests/styleStub.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Tests run against the client source, so a change in the core is exercised
    // here without a build in between.
    '^@seamless-auth/client$': '<rootDir>/../client/src/index.ts',
  },
  testMatch: ['<rootDir>/tests/**/*.(test|spec).ts'],
};
