import fastify, { FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

import authPlugin from "../../src/plugins/auth";
import authRoutes from "../../src/routes/auth";
import usersRoutes from "../../src/routes/users";

/**
 * Creates a test Fastify app instance with mocked Prisma client
 * Use this for unit and integration tests where you want to control the database
 */
export async function buildTestApp(
  prismaMock?: Partial<PrismaClient>
): Promise<FastifyInstance> {
  const app = fastify({ logger: false });

  // Register cookie plugin (required for refresh tokens)
  await app.register(fastifyCookie);

  // Register mock Prisma if provided, otherwise use real client
  if (prismaMock) {
    app.decorate("prisma", prismaMock as PrismaClient);
  } else {
    const prisma = new PrismaClient().$extends({
      query: {
        user: {
          create: async ({ args, query }) => {
            args.data.password = await bcrypt.hash(args.data.password, 10);
            return query(args);
          },
        },
      },
    });
    await prisma.$connect();
    app.decorate("prisma", prisma as unknown as PrismaClient);

    app.addHook("onClose", async () => {
      await prisma.$disconnect();
    });
  }

  // Register auth plugin (JWT + authenticate/authorize decorators)
  await app.register(authPlugin);

  // Register routes
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(usersRoutes, { prefix: "/api/v1" });

  // Health check route
  app.get("/", async () => ({ status: "ok" }));

  await app.ready();

  return app;
}

/**
 * Creates a Prisma mock with common operations
 */
export function createPrismaMock() {
  return {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
}

/**
 * Test user data factory
 */
export const testUsers = {
  validUser: {
    email: "test@example.com",
    password: "password123",
    name: "Test User",
  },
  adminUser: {
    email: "admin@example.com",
    password: "adminpass123",
    name: "Admin User",
  },
  moderatorUser: {
    email: "moderator@example.com",
    password: "modpass123",
    name: "Moderator User",
  },
};

/**
 * Generate a unique email for testing to avoid conflicts
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}@example.com`;
}

// Import vi from vitest for mocking
import { vi } from "vitest";
