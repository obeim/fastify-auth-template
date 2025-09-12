# Fastify Auth Template (TypeScript + Prisma)

A secure authentication & authorization starter template built with **Fastify**, **TypeScript**, and **Prisma**, following **OWASP security best practices**.

## Features

- **JWT Authentication**
  - Access token stored in memory
  - Refresh token stored in **HTTP-only secure cookies**
- **Role-based authorization**
  - Example roles: `admin`, `user`
- **OWASP Security Standards**
  - Secure cookie flags (`HttpOnly`, `Secure`, `SameSite`)
  - Token rotation on refresh
  - CORS with strict origin & credentials
  - Input validation with [TypeBox](https://github.com/sinclairzx81/typebox)
- **Tech stack**
  - [Fastify](https://fastify.io/) for blazing-fast backend
  - [TypeScript](https://www.typescriptlang.org/) for type safety
  - [Prisma](https://www.prisma.io/) for database ORM
  - [PostgreSQL](https://www.postgresql.org/) database
