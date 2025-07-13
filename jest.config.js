/** @type {import('jest').Config} */
const config = {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

    transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", {
            tsconfig: "tsconfig.json",
            useESM: false,
        }],
    },

    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^@lib/(.*)$": "<rootDir>/src/lib/$1",
        "^@components/(.*)$": "<rootDir>/src/components/$1",
        "\\.(css|less|scss|sass)$": "identity-obj-proxy",
        "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
    },

    testMatch: [
        "**/__tests__/**/*.(ts|tsx|js)",
        "**/*.(test|spec).(ts|tsx|js)",
    ],

    clearMocks: true,
    restoreMocks: true,
    testTimeout: 10000,
    verbose: true,

    testPathIgnorePatterns: [
        "<rootDir>/.next/",
        "<rootDir>/node_modules/",
    ],
};

module.exports = config;
