const nextJest = require("next/jest")

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you by Next.js, but you can add more here)
    "^@/components/(.*)$": "<rootDir>/components/$1",
    "^@/lib/(.*)$": "<rootDir>/lib/$1",
    "^@/hooks/(.*)$": "<rootDir>/hooks/$1",
    "^@/app/(.*)$": "<rootDir>/app/$1",
    "^@/scripts/(.*)$": "<rootDir>/scripts/$1",
    "^@/etf-data-service$": "<rootDir>/etf-data-service.ts",
    "^@/portfolio-parser$": "<rootDir>/portfolio-parser.ts",
  },
  testEnvironment: "jest-environment-jsdom",
  // Remove custom transform since Next.js Jest handles TypeScript/JSX automatically
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/scripts/", // Ignore scripts folder from Jest tests
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
