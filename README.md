# Fastify Auth Template (TypeScript + Prisma)

A secure authentication & authorization starter template built with **Fastify**, **TypeScript**, and **Prisma**, following **OWASP security best practices**. Designed as a boilerplate for small to mid-sized projects.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
- [Development](#development)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Role-Based Authorization](#role-based-authorization)
- [Testing](#testing)
  - [Test Structure](#test-structure)
  - [Running Tests](#running-tests)
  - [Writing Tests](#writing-tests)
- [Security Best Practices](#security-best-practices)
- [Project Guidelines](#project-guidelines)
- [Contributing](#contributing)

---

## Features

- **JWT Authentication**
  - Access token stored in memory (15-minute expiry)
  - Refresh token stored in **HTTP-only secure cookies** (7-day expiry)
  - Automatic token rotation on refresh
- **Role-based Authorization**
  - Built-in roles: `USER`, `ADMIN`, `MODERATOR`
  - Flexible route protection with role combinations
- **OWASP Security Standards**
  - Secure cookie flags (`HttpOnly`, `Secure`, `SameSite=Strict`)
  - Token rotation on refresh (prevents token replay attacks)
  - CORS with strict origin & credentials
  - Input validation with [TypeBox](https://github.com/sinclairzx81/typebox)
  - Password hashing with bcrypt (10 rounds)
  - Helmet for secure HTTP headers
  - Rate limiting (100 requests/minute)
- **Developer Experience**
  - Full TypeScript support with strict typing
  - Hot reload in development
  - ESLint + Husky for code quality
  - Comprehensive test suite (Unit, Integration, E2E)

---

## Tech Stack

| Technology                                         | Purpose                              |
| -------------------------------------------------- | ------------------------------------ |
| [Fastify](https://fastify.io/)                     | High-performance web framework       |
| [TypeScript](https://www.typescriptlang.org/)      | Type safety and developer experience |
| [Prisma](https://www.prisma.io/)                   | Database ORM with type-safe queries  |
| [PostgreSQL](https://www.postgresql.org/)          | Primary database                     |
| [Vitest](https://vitest.dev/)                      | Testing framework                    |
| [TypeBox](https://github.com/sinclairzx81/typebox) | Runtime type validation              |

---

## Project Structure

```
fastify-auth-template/
├── src/
│   ├── server.ts              # Application entry point
│   ├── config/
│   │   └── config.ts          # Environment configuration
│   ├── controllers/
│   │   ├── auth.controller.ts # Authentication request handlers
│   │   └── users.controller.ts# User routes request handlers
│   ├── plugins/
│   │   ├── auth.ts            # JWT authentication plugin
│   │   └── prisma.ts          # Prisma database plugin
│   ├── routes/
│   │   ├── auth.ts            # Authentication routes
│   │   └── users.ts           # User routes (with role examples)
│   ├── services/
│   │   ├── auth.service.ts    # Business logic for auth
│   │   └── auth.service.test.ts # Unit tests for auth service
│   ├── types/
│   │   ├── auth.d.ts          # JWT payload type definitions
│   │   └── fastify.d.ts       # Fastify request/reply types
│   └── validations/
│       └── auth.ts            # TypeBox validation schemas
├── __tests__/
│   ├── helpers/
│   │   ├── test-app.ts        # Test application builder
│   │   └── test-database.ts   # Database utilities for tests
│   ├── e2e/
│   │   ├── auth.e2e.test.ts   # End-to-end auth flow tests
│   │   └── users.e2e.test.ts  # End-to-end user flow tests
│   └── integration/
│       ├── auth.integration.test.ts  # Auth API integration tests
│       └── users.integration.test.ts # User routes integration tests
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── vitest.config.ts           # Test configuration
├── tsconfig.json              # TypeScript configuration
├── eslint.config.ts           # ESLint configuration
└── package.json               # Dependencies and scripts
```

### Directory Breakdown

| Directory                | Purpose                                                   |
| ------------------------ | --------------------------------------------------------- |
| `src/config/`            | Application configuration and environment variables       |
| `src/controllers/`       | HTTP request handlers (thin layer, delegates to services) |
| `src/plugins/`           | Fastify plugins for cross-cutting concerns                |
| `src/routes/`            | Route definitions and middleware attachment               |
| `src/services/`          | Business logic layer (testable, framework-agnostic)       |
| `src/types/`             | TypeScript type definitions and declarations              |
| `src/validations/`       | Request/response validation schemas                       |
| `__tests__/helpers/`     | Shared test utilities and fixtures                        |
| `__tests__/e2e/`         | End-to-end tests (complete user flows)                    |
| `__tests__/integration/` | Integration tests (API endpoint testing)                  |
| `prisma/`                | Database schema and migrations                            |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **pnpm** (recommended) or npm
- **PostgreSQL** >= 13.x
- **Docker** (optional, for containerized development)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd fastify-auth-template

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# CORS (JSON array of allowed origins)
CORS_ALLOWED_ORIGINS='["http://localhost:3000", "http://localhost:5173"]'
```

> ⚠️ **Important**: Never commit `.env` to version control. Use strong, unique secrets in production.

### Database Setup

```bash
# Run migrations
pnpm prisma migrate dev

# (Optional) Seed the database
pnpm prisma db seed

# View database in Prisma Studio
pnpm prisma studio
```

---

## Development

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm check-types

# Linting
pnpm lint
```

---

## API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint    | Description                  | Auth Required |
| ------ | ----------- | ---------------------------- | ------------- |
| `POST` | `/register` | Register a new user          | No            |
| `POST` | `/login`    | Login and get tokens         | No            |
| `GET`  | `/refresh`  | Refresh access token         | Cookie        |
| `GET`  | `/logout`   | Logout and invalidate tokens | Yes           |

### User Routes (`/api/v1`)

| Method | Endpoint                  | Description              | Required Role          |
| ------ | ------------------------- | ------------------------ | ---------------------- |
| `GET`  | `/publicRoute`            | Public endpoint          | None                   |
| `GET`  | `/authRoute`              | Authenticated users only | Any authenticated      |
| `GET`  | `/adminRoute`             | Admin only               | `ADMIN`                |
| `GET`  | `/moderatorRoute`         | Moderator only           | `MODERATOR`            |
| `GET`  | `/moderatorAndAdminRoute` | Admin or Moderator       | `ADMIN` or `MODERATOR` |

### Request/Response Examples

**Register**

```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Login**

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Response
{
  "user": { "id": 1, "name": "John Doe", "role": "USER" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
# + HttpOnly cookie: refreshToken
```

**Access Protected Route**

```bash
GET /api/v1/authRoute
Authorization: Bearer <accessToken>
```

---

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Server    │     │  Database   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. POST /login    │                   │
       │──────────────────>│                   │
       │                   │ 2. Verify creds   │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │                   │
       │ 3. Access Token   │                   │
       │   + Refresh Cookie│                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 4. GET /protected │                   │
       │   + Bearer Token  │                   │
       │──────────────────>│                   │
       │                   │ 5. Verify JWT     │
       │                   │                   │
       │ 6. Response       │                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 7. GET /refresh   │                   │
       │   + Cookie        │                   │
       │──────────────────>│                   │
       │                   │ 8. Validate &     │
       │                   │    Rotate Token   │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │ 9. New Tokens     │                   │
       │<──────────────────│                   │
       │                   │                   │
```

### Token Specifications

| Token         | Storage          | Expiry     | Purpose            |
| ------------- | ---------------- | ---------- | ------------------ |
| Access Token  | Client memory    | 15 minutes | API authentication |
| Refresh Token | HTTP-only cookie | 7 days     | Token renewal      |

---

## Role-Based Authorization

### Available Roles

```typescript
enum UserRole {
  USER      // Default role for new registrations
  ADMIN     // Full administrative access
  MODERATOR // Limited administrative access
}
```

### Protecting Routes

```typescript
// Single role
fastify.get(
  "/admin",
  {
    preHandler: [fastify.authenticate, fastify.authorize([UserRole.ADMIN])],
  },
  handler
);

// Multiple roles (OR logic)
fastify.get(
  "/staff",
  {
    preHandler: [
      fastify.authenticate,
      fastify.authorize([UserRole.ADMIN, UserRole.MODERATOR]),
    ],
  },
  handler
);

// Any authenticated user
fastify.get(
  "/profile",
  {
    preHandler: [fastify.authenticate],
  },
  handler
);
```

---

## Testing

### Test Structure

```
__tests__/
├── helpers/                    # Shared test utilities
│   ├── test-app.ts            # Builds test Fastify instance
│   └── test-database.ts       # Database seeding & cleanup
├── e2e/                       # End-to-End Tests
│   ├── auth.e2e.test.ts       # Complete auth user journeys
│   └── users.e2e.test.ts      # Multi-user scenarios
└── integration/               # Integration Tests
    ├── auth.integration.test.ts   # Auth API endpoints
    └── users.integration.test.ts  # User route permissions

src/services/
└── auth.service.test.ts       # Unit tests (mocked dependencies)
```

### Test Types

| Type            | Location                 | Purpose                          | Database       |
| --------------- | ------------------------ | -------------------------------- | -------------- |
| **Unit**        | `src/**/*.test.ts`       | Test business logic in isolation | Mocked         |
| **Integration** | `__tests__/integration/` | Test API endpoints               | Real (test DB) |
| **E2E**         | `__tests__/e2e/`         | Test complete user flows         | Real (test DB) |

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run specific test file
pnpm test -- auth.integration.test.ts

# Run with coverage
pnpm test -- --coverage

# Run only unit tests
pnpm test -- src/

# Run only integration tests
pnpm test -- __tests__/integration/

# Run only E2E tests
pnpm test -- __tests__/e2e/
```

### Writing Tests

**Unit Test Example** (with mocks)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import AuthService from "./auth.service";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    authService = new AuthService(fastifyMock as any);
  });

  it("should throw error for invalid credentials", async () => {
    prismaMock.user.findUnique.mockReturnValue(null);
    await expect(
      authService.loginUser("test@email.com", "pass")
    ).rejects.toThrow("Invalid credentials");
  });
});
```

**Integration Test Example** (real API calls)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildTestApp, generateTestEmail } from "../helpers/test-app";

describe("Auth API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should register a user", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: generateTestEmail(),
        password: "password123",
        name: "Test User",
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
```

**E2E Test Example** (complete flows)

```typescript
describe("User Journey", () => {
  it("register → login → access protected → logout", async () => {
    // 1. Register
    const register = await app.inject({
      /* ... */
    });
    expect(register.statusCode).toBe(201);

    // 2. Login
    const login = await app.inject({
      /* ... */
    });
    const { accessToken } = JSON.parse(login.payload);

    // 3. Access protected route
    const protected = await app.inject({
      method: "GET",
      url: "/api/v1/authRoute",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(protected.statusCode).toBe(200);

    // 4. Logout
    const logout = await app.inject({
      /* ... */
    });
    expect(logout.statusCode).toBe(200);
  });
});
```

---

## Security Best Practices

This template implements several OWASP recommendations:

| Practice                    | Implementation                                       |
| --------------------------- | ---------------------------------------------------- |
| **Secure Password Storage** | bcrypt with 10 salt rounds                           |
| **JWT Security**            | Short-lived access tokens, HTTP-only refresh cookies |
| **Token Rotation**          | Refresh tokens are rotated on each use               |
| **CORS**                    | Strict origin allowlist with credentials             |
| **HTTP Headers**            | Helmet with CSP, CORP, and other security headers    |
| **Rate Limiting**           | 100 requests per minute per IP                       |
| **Input Validation**        | TypeBox schema validation on all inputs              |
| **Cookie Security**         | `HttpOnly`, `Secure`, `SameSite=Strict`              |

### Production Checklist

- [ ] Use strong, unique `JWT_SECRET` (32+ characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper `CORS_ALLOWED_ORIGINS`
- [ ] Use HTTPS (required for `Secure` cookies)
- [ ] Set up database connection pooling
- [ ] Enable logging and monitoring
- [ ] Review and adjust rate limits
- [ ] Set up health checks

---

## Project Guidelines

### Code Organization Rules

1. **Controllers** - Thin layer, only HTTP concerns (request/response)
2. **Services** - Business logic, testable without HTTP context
3. **Plugins** - Fastify decorators and hooks
4. **Routes** - Route definitions with middleware attachment
5. **Validations** - TypeBox schemas, no logic

### Adding New Features

1. **New Route**

   ```
   1. Create validation schema in src/validations/
   2. Create/update service in src/services/
   3. Create/update controller in src/controllers/
   4. Register route in src/routes/
   5. Add tests (unit + integration)
   ```

2. **New Role**
   ```
   1. Add to UserRole enum in prisma/schema.prisma
   2. Run pnpm prisma migrate dev
   3. Update route preHandlers as needed
   4. Add E2E tests for role access
   ```

### File Naming Conventions

| Type              | Pattern                  | Example                    |
| ----------------- | ------------------------ | -------------------------- |
| Controllers       | `*.controller.ts`        | `auth.controller.ts`       |
| Services          | `*.service.ts`           | `auth.service.ts`          |
| Routes            | `*.ts` (in routes/)      | `auth.ts`                  |
| Validations       | `*.ts` (in validations/) | `auth.ts`                  |
| Unit Tests        | `*.test.ts` (co-located) | `auth.service.test.ts`     |
| Integration Tests | `*.integration.test.ts`  | `auth.integration.test.ts` |
| E2E Tests         | `*.e2e.test.ts`          | `auth.e2e.test.ts`         |
