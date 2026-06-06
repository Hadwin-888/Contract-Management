import { PrismaClient } from '@prisma/client';
import { createTestPrisma } from './test-prisma.js';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const prisma = process.env.VITEST
  ? (globalForPrisma.prisma ?? createTestPrisma() as unknown as PrismaClient)
  : (globalForPrisma.prisma ?? new PrismaClient());

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
