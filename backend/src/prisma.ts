import { PrismaClient } from './generated/prisma/client.js';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://admin:admin123@localhost:5432/admin_platform',
});

export default prisma;
