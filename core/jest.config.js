/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest",
  testEnvironment: "jest-environment-node",
  rootDir: "./src",
  testMatch: ["**/*.test.ts"],
  globals: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: "0.0.1",
  },
  // collectCoverage: true,
  // collectCoverageFrom: ["**/*.{ts}", "!**/*.test.{ts}", "!**/node_modules/**", "!**/vendor/**"],
  // coverageDirectory: "../coverage",
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
};
