/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the GNU Affero General Public License v3.0
 * See LICENSE file in the project root for full license information
 */

export default {
  displayName: 'react-native',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { useESM: true, tsconfig: '<rootDir>/tsconfig.json' }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@seamless-auth/client$': '<rootDir>/../client/src/index.ts',
  },
  testMatch: ['<rootDir>/tests/**/*.(test|spec).[tj]s?(x)'],
};
