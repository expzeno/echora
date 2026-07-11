import { PrismaClient } from '@prisma/client';
import { PrismaClient as LogsPrismaClient } from '../../node_modules/.prisma/logs-client/index.js';
import { auditExtension } from './audit.js';

const POOL_SIZE = Number(process.env.PRISMA_POOL_SIZE) || 5;
const POOL_TIMEOUT = Number(process.env.PRISMA_POOL_TIMEOUT) || 10;

function withPool(baseUrl, limit = POOL_SIZE, timeout = POOL_TIMEOUT) {
  try {
    const u = new URL(baseUrl);
    u.searchParams.set('connection_limit', String(limit));
    u.searchParams.set('pool_timeout', String(timeout));
    return u.toString();
  } catch {
    return baseUrl;
  }
}

export const prisma = new PrismaClient({
  datasources: { db: { url: withPool(process.env.DATABASE_URL) } },
}).$extends(auditExtension);

export const logsPrisma = new LogsPrismaClient({
  datasources: { db: { url: withPool(process.env.LOGS_DATABASE_URL) } },
});
