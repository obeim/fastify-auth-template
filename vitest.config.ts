import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Global test configuration
    globals: true,

    // Test environment
    environment: "node",

    // Test file patterns
    include: [
      "src/**/*.test.ts", // Unit tests
      "__tests__/**/*.test.ts", // Integration & E2E tests
    ],

    // Exclude patterns
    exclude: ["node_modules", "dist"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "__tests__/",
        "dist/",
        "*.config.*",
        "src/types/",
      ],
    },

    // Timeout for each test (useful for E2E tests)
    testTimeout: 30000,

    // Hooks timeout
    hookTimeout: 30000,

    // Retry failed tests
    retry: 0,

    // Pool options - use forks with single thread to avoid database conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Reporter
    reporters: ["verbose"],

    // Setup files - loads .env.test before running tests
    setupFiles: ["__tests__/setup.ts"],

    // Sequence options
    sequence: {
      // Run tests in sequence for database tests to avoid conflicts
      concurrent: false,
    },
  },
});
