import { Config } from 'vitest';

const config: Config = {
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['lcov', 'text-summary'],
  reporters: ['default']
};

export default config;
