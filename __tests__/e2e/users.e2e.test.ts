import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
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
 * E2E Tests for User Management Flows
 *
 * These tests verify complete user workflows including:
 * - Multi-role user scenarios
 * - Session management
 * - Concurrent access patterns
 */

describe("User Management E2E", () => {
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

  describe("Multi-User Scenarios", () => {
    it("different users with different roles can coexist and access appropriate routes", async () => {
      // Create users with different roles
      const adminEmail = generateTestEmail();
      const modEmail = generateTestEmail();
      const userEmail = generateTestEmail();

      await seedTestUser({
        email: adminEmail,
        password: "admin123",
        name: "Admin",
        role: UserRole.ADMIN,
      });

      await seedTestUser({
        email: modEmail,
        password: "mod123",
        name: "Moderator",
        role: UserRole.MODERATOR,
      });

      await seedTestUser({
        email: userEmail,
        password: "user123",
        name: "User",
        role: UserRole.USER,
      });

      // Login all users
      const [adminLogin, modLogin, userLogin] = await Promise.all([
        app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: { email: adminEmail, password: "admin123" },
        }),
        app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: { email: modEmail, password: "mod123" },
        }),
        app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: { email: userEmail, password: "user123" },
        }),
      ]);

      const adminToken = JSON.parse(adminLogin.payload).accessToken;
      const modToken = JSON.parse(modLogin.payload).accessToken;
      const userToken = JSON.parse(userLogin.payload).accessToken;

      // Admin can access admin route
      const adminAccess = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(adminAccess.statusCode).toBe(200);

      // Moderator can access moderator route
      const modAccess = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorRoute",
        headers: { authorization: `Bearer ${modToken}` },
      });
      expect(modAccess.statusCode).toBe(200);

      // User can only access auth route
      const userAuth = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(userAuth.statusCode).toBe(200);

      // User cannot access admin route
      const userAdmin = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: { authorization: `Bearer ${userToken}` },
      });
      expect(userAdmin.statusCode).toBe(403);
    });
  });

  describe("Session Management", () => {
    it("user can login from multiple sessions and both sessions work", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
      });

      // First login
      const firstLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: testEmail, password: "password123" },
      });

      // Second login (simulating another device/browser)
      const secondLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: testEmail, password: "password123" },
      });

      const firstToken = JSON.parse(firstLogin.payload).accessToken;
      const secondToken = JSON.parse(secondLogin.payload).accessToken;

      // Both tokens should be valid (they may be identical if generated in same second due to JWT iat)
      expect(firstToken).toBeDefined();
      expect(secondToken).toBeDefined();

      // Both sessions can access protected routes
      const firstAccess = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: { authorization: `Bearer ${firstToken}` },
      });

      const secondAccess = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: { authorization: `Bearer ${secondToken}` },
      });

      expect(firstAccess.statusCode).toBe(200);
      expect(secondAccess.statusCode).toBe(200);
    });

    it("logout should invalidate refresh token", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
      });

      // Login
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: testEmail, password: "password123" },
      });

      const { accessToken } = JSON.parse(loginResponse.payload);
      const refreshToken = loginResponse.cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      )?.value;

      // Verify refresh token exists in DB
      let dbUser = await getTestUserByEmail(testEmail);
      expect(dbUser?.refreshToken).toBeDefined();

      // Logout
      await app.inject({
        method: "GET",
        url: "/api/v1/auth/logout",
        headers: { authorization: `Bearer ${accessToken}` },
      });

      // Verify refresh token is cleared from DB
      dbUser = await getTestUserByEmail(testEmail);
      expect(dbUser?.refreshToken).toBeNull();

      // Attempt to refresh should fail
      const refreshResponse = await app.inject({
        method: "GET",
        url: "/api/v1/auth/refresh",
        cookies: { refreshToken: refreshToken || "" },
      });

      expect(refreshResponse.statusCode).toBe(401);
    });
  });

  describe("Token Lifecycle", () => {
    it("should support complete token refresh flow", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
      });

      // Login
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: testEmail, password: "password123" },
      });

      const initialToken = JSON.parse(loginResponse.payload).accessToken;
      let refreshToken = loginResponse.cookies.find(
        (c: { name: string }) => c.name === "refreshToken"
      )?.value;

      // Refresh multiple times
      for (let i = 0; i < 3; i++) {
        const refreshResponse = await app.inject({
          method: "GET",
          url: "/api/v1/auth/refresh",
          cookies: { refreshToken: refreshToken || "" },
        });

        expect(refreshResponse.statusCode).toBe(200);

        const newAccessToken = JSON.parse(refreshResponse.payload).accessToken;
        expect(newAccessToken).toBeDefined();

        // Update refresh token for next iteration
        refreshToken = refreshResponse.cookies.find(
          (c: { name: string }) => c.name === "refreshToken"
        )?.value;

        // Each new access token should work
        const protectedAccess = await app.inject({
          method: "GET",
          url: "/api/v1/authRoute",
          headers: { authorization: `Bearer ${newAccessToken}` },
        });

        expect(protectedAccess.statusCode).toBe(200);
      }
    });
  });

  describe("Error Recovery", () => {
    it("user can re-login after failed attempts", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
      });

      // Failed login attempts
      for (let i = 0; i < 3; i++) {
        const failedLogin = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: { email: testEmail, password: "wrongpassword" },
        });
        expect(failedLogin.statusCode).toBe(401);
      }

      // Successful login should still work
      const successLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: testEmail, password: "password123" },
      });

      expect(successLogin.statusCode).toBe(201);
    });

    it("user can register after failed registration with invalid data", async () => {
      const testEmail = generateTestEmail();

      // Failed registration (invalid email)
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: "invalid-email",
          password: "password123",
          name: "Test User",
        },
      });

      // Failed registration (short password)
      await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "short",
          name: "Test User",
        },
      });

      // Successful registration
      const successRegister = await app.inject({
        method: "POST",
        url: "/api/v1/auth/register",
        payload: {
          email: testEmail,
          password: "password123",
          name: "Test User",
        },
      });

      expect(successRegister.statusCode).toBe(201);
    });
  });

  describe("Health Check", () => {
    it("API root should return status ok", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe("ok");
    });
  });
});
