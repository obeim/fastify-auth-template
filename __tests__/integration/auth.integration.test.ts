import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";
import { buildTestApp, generateTestEmail } from "../helpers/test-app";
import {
  cleanupTestData,
  disconnectTestPrisma,
  seedTestUser,
  getTestUserByEmail,
} from "../helpers/test-database";

/**
 * Integration Tests for Authentication API
 *
 * These tests verify individual API endpoints work correctly in isolation.
 * They focus on:
 * - Request/response validation
 * - HTTP status codes
 * - Error handling
 * - Cookie management
 * - Input validation
 *
 * Prerequisites:
 * - A running PostgreSQL database (test database recommended)
 * - DATABASE_URL environment variable set
 */

describe("Auth API Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await cleanupTestData();
    app = await buildTestApp();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
    await disconnectTestPrisma();
  });

  afterEach(async () => {
    // Clean up after each test to ensure isolation
    await cleanupTestData();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const testEmail = generateTestEmail();

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "securePassword123",
          name: "New User",
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.email).toBe(testEmail);
      expect(body.name).toBe("New User");
      expect(body.role).toBe(UserRole.USER);
      expect(body.password).toBeUndefined(); // Password should never be returned
      // refreshToken is null by default in Prisma, which is fine

      // Verify user was actually created in database
      const dbUser = await getTestUserByEmail(testEmail);
      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(testEmail);
    });

    it("should return 403 when email already exists", async () => {
      const testEmail = generateTestEmail();

      // Seed existing user
      await seedTestUser({
        email: testEmail,
        password: "existingPass123",
        name: "Existing User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "newPassword123",
          name: "New User",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain("exist");
    });

    it("should return 400 for invalid email format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "invalid-email",
          password: "password123",
          name: "Test User",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for password shorter than 8 characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: generateTestEmail(),
          password: "short",
          name: "Test User",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: generateTestEmail(),
          // missing password and name
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login successfully and return tokens", async () => {
      const testEmail = generateTestEmail();
      const testPassword = "password123";

      await seedTestUser({
        email: testEmail,
        password: testPassword,
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.accessToken).toBeDefined();
      expect(body.user).toBeDefined();
      expect(body.user.name).toBeDefined(); // User object has name, not email per schema

      // Check refresh token cookie
      const cookies = response.cookies;
      const refreshCookie = cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      );
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie?.httpOnly).toBe(true);
      expect(refreshCookie?.secure).toBe(true);
      expect(refreshCookie?.sameSite).toBe("Strict");
    });

    it("should return 401 for wrong password", async () => {
      const testEmail = generateTestEmail();

      await seedTestUser({
        email: testEmail,
        password: "correctPassword",
        name: "Test User",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "wrongPassword",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.message).toContain("credentials");
    });

    it("should return 401 for non-existent user", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "nonexistent@example.com",
          password: "anyPassword",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 400 for invalid email format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "not-an-email",
          password: "password123",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should store refresh token in database after login", async () => {
      const testEmail = generateTestEmail();

      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
      });

      await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "password123",
        },
      });

      // Verify refresh token was stored in database
      const dbUser = await getTestUserByEmail(testEmail);
      expect(dbUser?.refreshToken).toBeDefined();
      expect(dbUser?.refreshToken).not.toBeNull();
    });
  });

  describe("GET /api/v1/auth/refresh", () => {
    it("should refresh tokens successfully", async () => {
      const testEmail = generateTestEmail();

      // Register user via API (not seed) to get proper refresh token flow
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "password123",
          name: "Test User",
        },
      });

      // Login to get refresh token
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "password123",
        },
      });

      const refreshCookie = loginResponse.cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      );

      // Refresh the token
      const refreshResponse = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: {
          refreshToken: refreshCookie?.value || "",
        },
      });

      expect(refreshResponse.statusCode).toBe(200);

      const body = JSON.parse(refreshResponse.payload);
      expect(body.accessToken).toBeDefined();

      // Verify new refresh token cookie is set
      const newRefreshCookie = refreshResponse.cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      );
      expect(newRefreshCookie).toBeDefined();
    });

    it("should return 401 for invalid refresh token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: {
          refreshToken: "invalid-token",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return 401 when refresh token is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should invalidate old refresh token after refresh (token rotation)", async () => {
      const testEmail = generateTestEmail();

      // Register and login
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "password123",
          name: "Test User",
        },
      });

      // Login
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "password123",
        },
      });

      const oldRefreshToken = loginResponse.cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      )?.value;

      // Wait 1+ second to ensure different JWT timestamps (iat is in seconds)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // First refresh - should succeed and rotate the token
      const firstRefresh = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: {
          refreshToken: oldRefreshToken || "",
        },
      });

      expect(firstRefresh.statusCode).toBe(200);

      // Try to use old token again - should fail (token rotation invalidated it)
      const secondRefresh = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: {
          refreshToken: oldRefreshToken || "",
        },
      });

      expect(secondRefresh.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/auth/logout", () => {
    it("should logout successfully", async () => {
      const testEmail = generateTestEmail();

      // Register user
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "password123",
          name: "Test User",
        },
      });

      // Login
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "password123",
        },
      });

      const { accessToken } = JSON.parse(loginResponse.payload);

      // Logout
      const logoutResponse = await app.inject({
        method: "GET",
        url: "/api/v1/auth/logout",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(logoutResponse.statusCode).toBe(200);

      // Verify refresh token is removed from database
      const dbUser = await getTestUserByEmail(testEmail);
      expect(dbUser?.refreshToken).toBeNull();
    });

    it("should return 401 when not authenticated", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/logout",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Role-based Authorization", () => {
    describe("GET /api/v1/publicRoute", () => {
      it("should be accessible without authentication", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/v1/publicRoute",
        });

        expect(response.statusCode).toBe(200);
      });
    });

    describe("GET /api/v1/authRoute", () => {
      it("should be accessible with valid token", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Test User",
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/authRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.user).toBeDefined();
      });

      it("should return 401 without token", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/v1/authRoute",
        });

        expect(response.statusCode).toBe(401);
      });
    });

    describe("GET /api/v1/adminRoute", () => {
      it("should be accessible by admin user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Admin User",
          role: UserRole.ADMIN,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/adminRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
      });

      it("should return 403 for regular user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Regular User",
          role: UserRole.USER,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/adminRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      });

      it("should return 403 for moderator user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Moderator User",
          role: UserRole.MODERATOR,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/adminRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe("GET /api/v1/moderatorRoute", () => {
      it("should be accessible by moderator user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Moderator User",
          role: UserRole.MODERATOR,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/moderatorRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
      });

      it("should return 403 for regular user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Regular User",
          role: UserRole.USER,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/moderatorRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe("GET /api/v1/moderatorAndAdminRoute", () => {
      it("should be accessible by admin user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Admin User",
          role: UserRole.ADMIN,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/moderatorAndAdminRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
      });

      it("should be accessible by moderator user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Moderator User",
          role: UserRole.MODERATOR,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/moderatorAndAdminRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
      });

      it("should return 403 for regular user", async () => {
        const testEmail = generateTestEmail();

        await seedTestUser({
          email: testEmail,
          password: "password123",
          name: "Regular User",
          role: UserRole.USER,
        });

        const loginResponse = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: testEmail,
            password: "password123",
          },
        });

        const { accessToken } = JSON.parse(loginResponse.payload);

        const response = await app.inject({
          method: "GET",
          url: "/api/v1/moderatorAndAdminRoute",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      });
    });
  });
});
