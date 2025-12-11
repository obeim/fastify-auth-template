import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";
import { buildTestApp, generateTestEmail } from "../helpers/test-app";
import {
  cleanupTestData,
  disconnectTestPrisma,
  seedTestUser,
} from "../helpers/test-database";

/**
 * E2E Tests for Authentication Flow
 *
 * These tests simulate complete user journeys through the authentication system.
 * They test the full flow from registration to logout, including:
 * - User registration
 * - User login
 * - Token refresh
 * - Protected route access
 * - Role-based authorization
 * - User logout
 *
 * Prerequisites:
 * - A running PostgreSQL database (test database recommended)
 * - DATABASE_URL environment variable set
 *
 * Note: These tests use a real database connection. Ensure you're using
 * a test database to avoid affecting production data.
 */

describe("Auth User Flow E2E", () => {
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

  beforeEach(async () => {
    await cleanupTestData();
  });

  describe("Complete User Journey", () => {
    it("complete user journey: register → login → access protected → refresh → logout", async () => {
      const testEmail = generateTestEmail();
      const testPassword = "securePassword123";
      const testName = "E2E Test User";

      // Step 1: Register a new user
      const registerResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: testPassword,
          name: testName,
        },
      });

      expect(registerResponse.statusCode).toBe(201);
      const registeredUser = JSON.parse(registerResponse.payload);
      expect(registeredUser.email).toBe(testEmail);
      expect(registeredUser.name).toBe(testName);
      expect(registeredUser.password).toBeUndefined(); // Password should not be returned

      // Step 2: Login with the registered user
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(loginResponse.statusCode).toBe(201);
      const loginResult = JSON.parse(loginResponse.payload);
      expect(loginResult.accessToken).toBeDefined();
      expect(loginResult.user.id).toBeDefined();
      expect(loginResult.user.name).toBe(testName);

      // Verify refresh token is set as HTTP-only cookie
      const cookies = loginResponse.cookies;
      const refreshTokenCookie = cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie?.httpOnly).toBe(true);

      const accessToken = loginResult.accessToken;
      const refreshToken = refreshTokenCookie?.value;

      // Step 3: Access authenticated route with valid token
      const authRouteResponse = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(authRouteResponse.statusCode).toBe(200);
      const authResult = JSON.parse(authRouteResponse.payload);
      expect(authResult.message).toBe("authorized user route");
      expect(authResult.user).toBeDefined();

      // Step 4: Attempt to access admin route (should fail for regular user)
      const adminRouteResponse = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(adminRouteResponse.statusCode).toBe(403);

      // Step 5: Wait and then refresh the token (wait ensures different JWT timestamp)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const refreshResponse = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: {
          refreshToken: refreshToken!,
        },
      });

      expect(refreshResponse.statusCode).toBe(200);
      const refreshResult = JSON.parse(refreshResponse.payload);
      expect(refreshResult.accessToken).toBeDefined();
      expect(refreshResult.accessToken).not.toBe(accessToken); // New token should be different

      // Step 6: Use new access token to access protected route
      const newAccessToken = refreshResult.accessToken;
      const secondAuthResponse = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization: `Bearer ${newAccessToken}`,
        },
      });

      expect(secondAuthResponse.statusCode).toBe(200);

      // Step 7: Logout
      const logoutResponse = await app.inject({
        method: "GET",
        url: "/api/v1/auth/logout",
        headers: {
          authorization: `Bearer ${newAccessToken}`,
        },
      });

      expect(logoutResponse.statusCode).toBe(200);
    });

    it("should prevent duplicate registration with same email", async () => {
      const testEmail = generateTestEmail();

      // First registration
      const firstRegister = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "password123",
          name: "First User",
        },
      });

      expect(firstRegister.statusCode).toBe(201);

      // Second registration with same email
      const secondRegister = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "differentpassword",
          name: "Second User",
        },
      });

      expect(secondRegister.statusCode).toBe(403);
      const errorResult = JSON.parse(secondRegister.payload);
      expect(errorResult.message).toContain("exist");
    });
  });

  describe("Admin User Journey", () => {
    it("admin user can access admin-only routes", async () => {
      const testEmail = generateTestEmail();
      const testPassword = "adminPassword123";

      // Seed an admin user directly
      await seedTestUser({
        email: testEmail,
        password: testPassword,
        name: "Admin Test User",
        role: UserRole.ADMIN,
      });

      // Login as admin
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(loginResponse.statusCode).toBe(201);
      const { accessToken } = JSON.parse(loginResponse.payload);

      // Access admin route
      const adminResponse = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(adminResponse.statusCode).toBe(200);
      const adminResult = JSON.parse(adminResponse.payload);
      expect(adminResult.message).toBe("admin route");

      // Access admin+moderator shared route
      const sharedResponse = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorAndAdminRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(sharedResponse.statusCode).toBe(200);

      // Should NOT access moderator-only route
      const modResponse = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(modResponse.statusCode).toBe(403);
    });
  });

  describe("Moderator User Journey", () => {
    it("moderator user can access moderator-only routes", async () => {
      const testEmail = generateTestEmail();
      const testPassword = "modPassword123";

      // Seed a moderator user directly
      await seedTestUser({
        email: testEmail,
        password: testPassword,
        name: "Moderator Test User",
        role: UserRole.MODERATOR,
      });

      // Login as moderator
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(loginResponse.statusCode).toBe(201);
      const { accessToken } = JSON.parse(loginResponse.payload);

      // Access moderator route
      const modResponse = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(modResponse.statusCode).toBe(200);
      const modResult = JSON.parse(modResponse.payload);
      expect(modResult.message).toBe("moderator route");

      // Access shared route
      const sharedResponse = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorAndAdminRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(sharedResponse.statusCode).toBe(200);

      // Should NOT access admin-only route
      const adminResponse = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(adminResponse.statusCode).toBe(403);
    });
  });

  describe("Security Scenarios", () => {
    it("should reject requests without authentication token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject requests with invalid token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization: "Bearer invalid-token-here",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject requests with expired token format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization:
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6InRlc3QiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAwfQ.invalid",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should allow access to public routes without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/publicRoute",
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.message).toBe("public route");
    });

    it("should reject login with wrong password", async () => {
      const testEmail = generateTestEmail();

      // Create user
      await seedTestUser({
        email: testEmail,
        password: "correctPassword123",
        name: "Test User",
      });

      // Try login with wrong password
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: testEmail,
          password: "wrongPassword123",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject login with non-existent email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "nonexistent@example.com",
          password: "somepassword",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject refresh with invalid refresh token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: {
          refreshToken: "invalid-refresh-token",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
