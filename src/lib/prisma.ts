import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config.js';

let prismaClient: PrismaClient | null = null;

/**
 * Singleton instance of PrismaClient with PrismaPg adapter.
 * Uses DATABASE_URL (connection pooler) with fallback to DIRECT_URL.
 */
export const getPrismaClient = (): PrismaClient => {
  if (prismaClient) {
    return prismaClient;
  }

  const connectionString = config.database.url || config.database.directUrl;
  const adapter = new PrismaPg(connectionString);

  prismaClient = new PrismaClient({
    adapter,
    log: config.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
  });

  return prismaClient;
};

export const prisma = getPrismaClient();
