/**
 * Test DB helpers — direct Prisma access for inserting/deleting test fixtures.
 * Use only in global-setup or beforeEach/afterEach to seed records that the API
 * cannot create easily (missing sandbox accounts, cross-entity IDOR fixtures).
 *
 * Rules:
 * - Helpers are idempotent — check existence before creating
 * - DB helpers bypass business logic intentionally (no emails, no balance changes)
 * - Use findFirst + if (!exists) create — not blind upsert
 * - Always call disconnectDb() after global-setup finishes seeding
 * - Never use this for happy-path tests — use the API instead
 */
import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

let _client;
function getClient() {
  if (!_client) {
    _client = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://server_tridentity_me@localhost:5432/echora' } },
    });
  }
  return _client;
}

/**
 * Ensure a User (admin portal) account exists.
 * Idempotent — skips creation if the record already exists.
 */
export async function ensureAdminAccount({ email, password, name = 'Test Admin', role = 'admin' }) {
  const prisma = getClient();
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const hash = await bcryptjs.hash(password, 10);
    user = await prisma.user.create({
      data: { email, password: hash, name, role, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  return user;
}

/**
 * Ensure a Customer account exists.
 * Idempotent — skips creation if the record already exists.
 */
export async function ensureCustomerAccount({ email, password, name = 'Test Customer' }) {
  const prisma = getClient();
  let customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    const hash = await bcryptjs.hash(password, 10);
    customer = await prisma.customer.create({
      data: { email, password: hash, name, status: 'active', createdAt: new Date(), updatedAt: new Date() },
    });
  }
  return customer;
}

/**
 * Close the Prisma connection. Call at the end of global-setup after all seeding is done.
 */
export async function disconnectDb() {
  if (_client) {
    await _client.$disconnect();
    _client = null;
  }
}

// Add project-specific helpers below (e.g. ensureMerchantAccount, ensureIdorFixture).
// Pattern: findFirst → if (!exists) create → return record.
// Reference: expzeno/ZENO_NODE_V3/tests/helpers/db.js
