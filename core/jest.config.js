/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: "ts-jest",
    testEnvironment: "node",
    rootDir: "./src",
    testMatch: ["**/*.test.ts"],
    setupFilesAfterEnv: ["<rootDir>/test_resources/testSetup.ts"],
    testTimeout: 120000,
    globals: {
        __DEV__: true,
        __TEST__: true,
        __VERSION__: "0.0.1",
    },
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    extensionsToTreatAsEsm: [".ts"],
};
