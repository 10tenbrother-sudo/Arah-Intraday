// Prisma client singleton.
//
// Cached on globalThis so `tsx watch`-style restarts in dev do not open a new
// SQLite handle on every reload.
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined;
}

export const prisma =
  global._prisma ??
  new PrismaClient({
    log: process.env.PRISMA_LOG === '1' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

global._prisma = prisma;
