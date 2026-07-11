import { api, getToken } from '../helpers/api.js';

let adminToken;

beforeAll(async () => {
  adminToken = await getToken('admin');
});

describe('Customer — auth guard', () => {
  test('[P0-CRITICAL] list requires authentication — proves middleware blocks unauthenticated access', async () => {
    const res = await api.get('/company/customer/list');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] get single requires authentication', async () => {
    const res = await api.get('/company/customer/1');
    expect(res.status).toBe(401);
  });

  test('[P0-CRITICAL] create requires authentication', async () => {
    const res = await api.post('/company/customer/create', { data: {} });
    expect(res.status).toBe(401);
  });
});

describe('Customer — list', () => {
  test('[P1-HIGH] returns 200 with array — proves list endpoint works for authenticated admin', async () => {
    const res = await api.get('/company/customer/list', adminToken);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(Array.isArray(res.data.data)).toBe(true);
  });
});

describe('Customer — create + get + update', () => {
  const newCustomer = {
    email: `test-${Date.now()}@example.com`,
    displayName: 'Test Customer',
    password: 'testpass123',
  };
  let createdId;

  test('[P1-HIGH] creates customer with valid data — proves write path works', async () => {
    const res = await api.post('/company/customer/create', { data: newCustomer }, adminToken);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(typeof res.data.data.id).toBe('number');
    createdId = res.data.data.id;
  });

  test('[P1-HIGH] returns 400 when email is missing — proves Zod rejects incomplete payload', async () => {
    const res = await api.post('/company/customer/create', {
      data: { displayName: 'No Email', password: 'pass123' },
    }, adminToken);
    expect(res.status).toBe(400);
    expect(res.data.ok).toBe(false);
  });

  test('[P2-MEDIUM] returns 409 on duplicate email — proves unique constraint enforced', async () => {
    const res = await api.post('/company/customer/create', { data: newCustomer }, adminToken);
    expect(res.status).toBe(409);
    expect(res.data.ok).toBe(false);
  });

  test('[P1-HIGH] get by id returns correct customer — proves single-record fetch works', async () => {
    if (!createdId) throw new Error('Prerequisite failed: customer was not created — cannot test get-by-id');
    const res = await api.get(`/company/customer/${createdId}`, adminToken);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(res.data.data.id).toBe(createdId);
    expect(res.data.data.password).toBeUndefined();
  });

  test('[P1-HIGH] get unknown id returns 404 — proves missing record handled correctly', async () => {
    const res = await api.get('/company/customer/999999', adminToken);
    expect(res.status).toBe(404);
    expect(res.data.ok).toBe(false);
  });

  test('[P2-MEDIUM] update displayName succeeds — proves update path works', async () => {
    if (!createdId) throw new Error('Prerequisite failed: customer was not created — cannot test update');
    const res = await api.put(`/company/customer/${createdId}/update`, {
      data: { displayName: 'Updated Name' },
    }, adminToken);
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
  });

  // IDOR: add cross-user access tests in idor.test.js — login as customer A,
  // attempt to read/modify customer B's resources. See idor.test.js template.
});
