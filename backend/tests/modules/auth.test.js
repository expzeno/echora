import { api, getToken, getCredentials } from '../helpers/api.js';

const adminCred = getCredentials('admin');
const customerCred = getCredentials('customer');

describe('Admin Auth', () => {
  test('[P0-CRITICAL] login with valid credentials returns JWT — proves auth pipeline works end-to-end', async () => {
    const res = await api.post('/company/access/login', {
      data: { email: adminCred.email, password: adminCred.password },
    });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    const token = res.data.token?.token || res.data.token;
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  test('[P0-CRITICAL] login with wrong password returns 401 — proves credential validation rejects bad passwords', async () => {
    const res = await api.post('/company/access/login', {
      data: { email: adminCred.email, password: 'wrongpass' },
    });
    expect(res.status).toBe(401);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] login with missing password returns 400 — proves Zod rejects incomplete payloads', async () => {
    const res = await api.post('/company/access/login', {
      data: { email: adminCred.email },
    });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] login with missing email returns 400 — proves Zod rejects incomplete payloads', async () => {
    const res = await api.post('/company/access/login', {
      data: { password: adminCred.password },
    });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P0-CRITICAL] profile requires authentication — proves middleware blocks unauthenticated access', async () => {
    const res = await api.get('/company/access/profile');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] garbage token returns 401 — proves JWT validation rejects arbitrary strings', async () => {
    const res = await api.get('/company/access/profile', 'not-a-real-jwt-token');
    expect(res.status).toBe(401);
  });

  test('[P1-HIGH] empty Bearer header returns 401 — proves empty token is not treated as "no auth"', async () => {
    const res = await api.get('/company/access/profile', '');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] profile returns user data and never leaks password', async () => {
    const token = await getToken('admin');
    const res = await api.get('/company/access/profile', token);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.profile.email).toBe(adminCred.email);
    expect(res.data.profile.password).toBeUndefined();
    expect(res.data.profile.passwordHash).toBeUndefined();
  });
});

describe('Customer Auth', () => {
  test('[P0-CRITICAL] login with valid credentials returns JWT', async () => {
    const res = await api.post('/customer/access/login', {
      data: { email: customerCred.email, password: customerCred.password },
    });
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    const token = res.data.token?.token || res.data.token;
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  test('[P0-CRITICAL] login with wrong password returns 401', async () => {
    const res = await api.post('/customer/access/login', {
      data: { email: customerCred.email, password: 'wrongpass' },
    });
    expect(res.status).toBe(401);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] login with missing fields returns 400', async () => {
    const res = await api.post('/customer/access/login', { data: {} });
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P0-CRITICAL] profile requires authentication', async () => {
    const res = await api.get('/customer/access/profile');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] profile returns customer data and never leaks password', async () => {
    const token = await getToken('customer');
    const res = await api.get('/customer/access/profile', token);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.profile.email).toBe(customerCred.email);
    expect(res.data.profile.password).toBeUndefined();
    expect(res.data.profile.passwordHash).toBeUndefined();
  });
});
