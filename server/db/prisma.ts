// Prisma client singleton.
//
// Cached on globalThis so `tsx watch`-style restarts in dev do not open a new
// PostgreSQL connection on every reload.
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL && process.env.SQL_USER && process.env.SQL_HOST) {
  const u = encodeURIComponent(process.env.SQL_USER);
  const p = encodeURIComponent(process.env.SQL_PASSWORD || '');
  const db = encodeURIComponent(process.env.SQL_DB_NAME || 'cloud_sql_development_database');
  const host = encodeURIComponent(process.env.SQL_HOST);
  process.env.DATABASE_URL = `postgresql://${u}:${p}@localhost/${db}?host=${host}`;
}

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

