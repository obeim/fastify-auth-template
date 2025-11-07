import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Global ignore patterns (applied before any configs)
  {
    // Global ignores (VS Code should respect these)
    ignores: ["**/__tests__/**", "**/*.test.ts"],
  },

  // TypeScript files config
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    extends: ["@typescript-eslint/recommended"],
    ignores: ["**/*.d.ts"],

    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.eslintRecommended.rules,
      "no-unused-vars": "off",
      // Enable the TypeScript-specific rule
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);
