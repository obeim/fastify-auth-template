import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { FastifyInstance } from "fastify";
import { UserRole } from "@prisma/client";
import { buildTestApp, generateTestEmail } from "../helpers/test-app";
import {
  cleanupTestData,
  disconnectTestPrisma,
  seedTestUser,
} from "../helpers/test-database";

/**
 * Integration Tests for User Routes
 *
 * These tests verify the user-related routes work correctly.
 * They focus on:
 * - Public vs protected route access
 * - Role-based access control
 * - Proper user data in responses
 */

describe("User Routes Integration", () => {
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
    // Clean up after each test
    await cleanupTestData();
  });

  /**
   * Helper function to login and get access token
   */
  async function getAccessToken(
    email: string,
    password: string
  ): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    return JSON.parse(response.payload).accessToken;
  }

  describe("Public Route", () => {
    it("should return 200 and message for unauthenticated request", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/publicRoute",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe("public route");
    });

    it("should return 200 and message for authenticated request", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/publicRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Authenticated Route", () => {
    it("should return user data for authenticated USER", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Test User",
        role: UserRole.USER,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe("authorized user route");
      expect(body.user).toBeDefined();
      expect(body.user.name).toBe("Test User");
      expect(body.user.role).toBe(UserRole.USER);
    });

    it("should return user data for authenticated ADMIN", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Admin User",
        role: UserRole.ADMIN,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.role).toBe(UserRole.ADMIN);
    });

    it("should return user data for authenticated MODERATOR", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Moderator User",
        role: UserRole.MODERATOR,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/authRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.role).toBe(UserRole.MODERATOR);
    });
  });

  describe("Admin Route", () => {
    it("should return 200 for ADMIN role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Admin User",
        role: UserRole.ADMIN,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe("admin route");
    });

    it("should return 403 for USER role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Regular User",
        role: UserRole.USER,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain("Forbidden");
    });

    it("should return 403 for MODERATOR role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Moderator User",
        role: UserRole.MODERATOR,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 401 without authentication", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/adminRoute",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("Moderator Route", () => {
    it("should return 200 for MODERATOR role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Moderator User",
        role: UserRole.MODERATOR,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe("moderator route");
    });

    it("should return 403 for USER role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Regular User",
        role: UserRole.USER,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 for ADMIN role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Admin User",
        role: UserRole.ADMIN,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Moderator and Admin Shared Route", () => {
    it("should return 200 for ADMIN role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Admin User",
        role: UserRole.ADMIN,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorAndAdminRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toBe("admin and moderator shared route");
    });

    it("should return 200 for MODERATOR role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Moderator User",
        role: UserRole.MODERATOR,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorAndAdminRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 403 for USER role", async () => {
      const testEmail = generateTestEmail();
      await seedTestUser({
        email: testEmail,
        password: "password123",
        name: "Regular User",
        role: UserRole.USER,
      });

      const token = await getAccessToken(testEmail, "password123");

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/moderatorAndAdminRoute",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
