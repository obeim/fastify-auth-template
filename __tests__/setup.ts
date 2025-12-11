/**
 * Vitest Global Setup
 *
 * Loads the test environment variables before running tests.
 * This ensures tests use a separate database from development.
 *
 * IMPORTANT: This must be loaded BEFORE any app modules that use dotenv.
 */

import dotenv from "dotenv";
import path from "path";

// Load .env.test FIRST (override=true ensures it takes precedence)
dotenv.config({
  path: path.resolve(process.cwd(), ".env.test"),
  override: true,
});

console.log("🧪 Test environment loaded");
console.log(
  "   Database:",
  process.env.DATABASE_URL?.split("@")[1]?.split("?")[0] || "unknown"
);
console.log("   JWT Secret:", process.env.JWT_SECRET?.substring(0, 10) + "...");
