import { api, getToken, getCredentials } from '../helpers/api.js';

const adminCred = getCredentials('admin');

describe('JWT Attacks', () => {
  test('[P0-CRITICAL] garbage token rejected — proves JWT validation does not accept arbitrary strings', async () => {
    const res = await api.get('/company/access/profile', 'this-is-not-a-jwt');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] empty Bearer rejected — proves empty string is not treated as anonymous', async () => {
    const res = await api.get('/company/access/profile', '');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] alg:none bypass attempt — crafts a token with {alg:"none"} header; expects 401', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 1, role: 'admin' })).toString('base64url');
    const fakeToken = `${header}.${payload}.`;
    const res = await api.get('/company/access/profile', fakeToken);
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] forged token with wrong secret rejected — proves server validates signature', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 1, role: 'admin', iat: Math.floor(Date.now() / 1000) })).toString('base64url');
    const fakeToken = `${header}.${payload}.fakesignature`;
    const res = await api.get('/company/access/profile', fakeToken);
    expect(res.status).toBe(401);
  });
});

describe('Cross-Portal Isolation', () => {
  test('[P0-CRITICAL] customer token cannot access admin endpoints — proves portal boundary enforced', async () => {
    const customerToken = await getToken('customer');
    const res = await api.get('/company/access/profile', customerToken);
    expect([401, 403]).toContain(res.status);
  });

  test('[P0-CRITICAL] admin token cannot access customer endpoints — proves portal boundary enforced', async () => {
    const adminToken = await getToken('admin');
    const res = await api.get('/customer/access/profile', adminToken);
    expect([401, 403]).toContain(res.status);
  });
});

describe('Type Coercion Attacks — proves Zod rejects non-string inputs that weak validation would coerce', () => {
  test('[P1-HIGH] boolean email rejected', async () => {
    const res = await api.post('/company/access/login', { data: { email: true, password: 'x' } });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] null email rejected', async () => {
    const res = await api.post('/company/access/login', { data: { email: null, password: 'x' } });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] array email rejected', async () => {
    const res = await api.post('/company/access/login', { data: { email: ['admin@demo.com'], password: 'x' } });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] missing data envelope rejected — proves wrapper validation works', async () => {
    const res = await api.post('/company/access/login', { email: adminCred.email, password: adminCred.password });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] nested object as password rejected', async () => {
    const res = await api.post('/company/access/login', { data: { email: adminCred.email, password: { $gt: '' } } });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });
});

describe('Input Injection', () => {
  test('[P1-HIGH] SQL injection in login email — proves parameterised queries block injection', async () => {
    const res = await api.post('/company/access/login', {
      data: { email: "' OR 1=1 --", password: 'x' },
    });
    expect([400, 401]).toContain(res.status);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] NoSQL injection object in email — proves Zod rejects object payloads', async () => {
    const res = await api.post('/company/access/login', {
      data: { email: { $gt: '' }, password: 'x' },
    });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });
});

describe('Rate Limit Enforcement', () => {
  // Skipped by default: triggering the rate limiter would lock out shared test
  // accounts for the rest of the suite. To run: restart the backend with
  // TEST_RATE_LIMIT_MAX=5 and then run this file in isolation.
  const rateLimitTest = process.env.TEST_RATE_LIMIT_MAX ? test : test.skip;

  rateLimitTest('[P1-HIGH] excessive login attempts trigger 429 — proves rate limiter engages', async () => {
    const max = Number(process.env.TEST_RATE_LIMIT_MAX) || 5;
    let got429 = false;
    for (let i = 0; i < max + 5; i++) {
      const res = await api.post('/company/access/login', {
        data: { email: adminCred.email, password: 'wrongpass' },
      });
      if (res.status === 429) { got429 = true; break; }
    }
    expect(got429).toBe(true);
  });
});

// PROJECT-SPECIFIC: Add SSRF tests here if the app accepts webhook URLs.
// See TESTING_STANDARD.md §9 "Webhook Security" for the full vector list:
// localhost, .local, 127.0.0.1, 169.254.169.254, RFC1918, IPv6, file://, creds in URL.
