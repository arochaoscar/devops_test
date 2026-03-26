/**
 * Prisma Client Singleton
 *
 * Creates a single PrismaClient instance shared across the application.
 * In development, the client is stored on globalThis to survive hot-reloads
 * without creating multiple database connections (Next.js re-imports modules
 * on each hot-reload, which would otherwise leak connections).
 *
 * In production, a single instance is created per process — no global caching
 * is needed because the module is only loaded once.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Cache the client on globalThis in development to prevent connection leaks
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
