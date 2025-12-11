import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

/**
 * Test database utilities for E2E and integration tests
 * These functions interact with a real test database
 */

let prisma: PrismaClient | null = null;

/**
 * Get or create a Prisma client for tests
 */
export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ["error"],
    });
  }
  return prisma;
}

/**
 * Disconnect from the test database
 */
export async function disconnectTestPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Clean up test data from the database
 * Call this before/after tests to ensure clean state
 */
export async function cleanupTestData(): Promise<void> {
  const client = getTestPrisma();

  // Delete all test users (users with emails containing 'test-' or '@example.com')
  await client.user.deleteMany({
    where: {
      OR: [
        { email: { contains: "test-" } },
        { email: { contains: "@example.com" } },
      ],
    },
  });
}

/**
 * Seed a test user directly in the database
 */
export async function seedTestUser(userData: {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}): Promise<{
  id: number;
  email: string;
  name: string;
  role: UserRole;
}> {
  const client = getTestPrisma();
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = await client.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role || UserRole.USER,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

/**
 * Delete a specific test user by email
 */
export async function deleteTestUser(email: string): Promise<void> {
  const client = getTestPrisma();

  try {
    await client.user.delete({
      where: { email },
    });
  } catch {
    // User might not exist, ignore error
  }
}

/**
 * Get a user by email (for test assertions)
 */
export async function getTestUserByEmail(email: string) {
  const client = getTestPrisma();
  return client.user.findUnique({
    where: { email },
  });
}
