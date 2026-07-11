/**
 * Vitest global setup — runs ONCE before any test file.
 * Logs into all portals and writes tokens to /tmp so individual test files
 * can read them without making redundant HTTP requests (which would exhaust
 * the per-identity rate limiter during a full suite run).
 *
 * Auto-seeding: if a login fails because the account is missing from the sandbox
 * DB, the helper creates it via direct Prisma access and retries. Tests must
 * never fail because fixture data is absent — seed it here.
 */
import { writeFileSync } from 'fs';
import axios from 'axios';
import { ensureAdminAccount, ensureCustomerAccount, disconnectDb } from '../helpers/db.js';

const BASE_URL = process.env.TEST_API_BASE || 'http://localhost:{{PRIMARY_BACKEND_PORT}}';
const TOKEN_FILE = '/tmp/{{PROJECT_NAME}}-test-tokens.json';

async function login(url, body) {
  try {
    const res = await axios.post(url, body, { validateStatus: () => true, timeout: 10000 });
    if (res.data?.ok) return res.data;
  } catch {
    // network error
  }
  return null;
}

export default async function globalSetup() {
  const tokens = {};

  // Admin — auto-seed if missing, then retry. FATAL if still fails.
  let admin = await login(`${BASE_URL}/company/access/login`, {
    data: { email: 'admin@demo.com', password: 'admin123' },
  });
  if (!admin) {
    await ensureAdminAccount({ email: 'admin@demo.com', password: 'admin123', name: 'Demo Admin', role: 'admin' });
    admin = await login(`${BASE_URL}/company/access/login`, { data: { email: 'admin@demo.com', password: 'admin123' } });
  }
  if (!admin) {
    await disconnectDb();
    throw new Error(
      `[global-setup] FATAL: admin login failed at ${BASE_URL} even after DB seed. ` +
      'Check: backend running, DB reachable, migrations applied.',
    );
  }
  tokens.admin = admin;

  // Customer — auto-seed if missing, non-fatal if still fails.
  let customer = await login(`${BASE_URL}/customer/access/login`, {
    data: { email: 'alice@example.com', password: 'customer123' },
  });
  if (!customer) {
    await ensureCustomerAccount({ email: 'alice@example.com', password: 'customer123', name: 'Alice' });
    customer = await login(`${BASE_URL}/customer/access/login`, { data: { email: 'alice@example.com', password: 'customer123' } });
  }
  if (customer) tokens.customer = customer;
  else console.warn('[global-setup] WARNING: customer login failed — customer portal tests will fail');

  // Always disconnect the DB helper connection before tests start
  await disconnectDb();

  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log(`[global-setup] Tokens written — admin ✓  customer: ${customer ? '✓' : '✗'}`);
}
