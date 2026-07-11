import { api, getToken } from '../helpers/api.js';

// IDOR (Insecure Direct Object Reference) tests verify that authenticated users
// cannot access resources belonging to other users. Every endpoint that takes an
// entity ID in the path or body needs at least one cross-user denial test.
//
// PROJECT-SPECIFIC: Replace the example endpoints below with your actual routes.
// Add one describe block per resource type (orders, wallets, notifications, etc.).

let adminToken;
let customerToken;

beforeAll(async () => {
  adminToken = await getToken('admin');
  customerToken = await getToken('customer');
});

describe('IDOR — Customer cannot access other customers\' data', () => {
  // The customer ID used here should belong to a DIFFERENT customer than the
  // logged-in test customer. In production test suites, resolve this from
  // global-setup (see TESTING_STANDARD.md §15 dynamic ID resolver pattern).
  const otherCustomerId = 999999;

  test('[P0-CRITICAL] customer cannot view another customer\'s profile — proves ownership check enforced', async () => {
    const res = await api.get(`/customer/profile/${otherCustomerId}`, customerToken);
    expect([403, 404]).toContain(res.status);
    if (res.data.detail) {
      expect(res.data.detail.email).toBeUndefined();
      expect(res.data.detail.password).toBeUndefined();
      expect(res.data.detail.displayName).toBeUndefined();
    }
  });

  // PROJECT-SPECIFIC: Add more IDOR tests for each customer-facing resource:
  //
  // test('[P0-CRITICAL] customer cannot view another customer\'s orders', ...)
  // test('[P0-CRITICAL] customer cannot view another customer\'s wallet', ...)
  // test('[P0-CRITICAL] customer cannot view another customer\'s notifications', ...)
  // test('[P0-CRITICAL] customer cannot cancel another customer\'s order', ...)
  //
  // For each: assert status 403 or 404, AND verify the response body does NOT
  // contain leaked fields (amount, email, address, etc.) — even denied responses
  // can leak data if the backend fetches-then-checks instead of query-scoping.
});

describe('IDOR — Information Leak Prevention', () => {
  test('[P0-CRITICAL] denied response does not leak entity fields — proves query-scoped access, not fetch-then-check', async () => {
    // Try to access a resource belonging to another user. Even if we get 403/404,
    // the response body must NOT contain any fields from the actual entity.
    const res = await api.get(`/customer/profile/${999999}`, customerToken);
    expect([403, 404]).toContain(res.status);

    // These fields should NEVER appear in a denied response
    expect(res.data.detail?.email).toBeUndefined();
    expect(res.data.detail?.phone).toBeUndefined();
    expect(res.data.detail?.address).toBeUndefined();
    expect(res.data.detail?.amount).toBeUndefined();
    expect(res.data.detail?.balance).toBeUndefined();
  });
});

describe('IDOR — Admin role boundary', () => {
  test('[P1-HIGH] customer token cannot access admin-only endpoints', async () => {
    const res = await api.get('/company/customer/list', customerToken);
    expect([401, 403]).toContain(res.status);
  });

  // PROJECT-SPECIFIC: If you have merchant portals, add:
  // test('[P0-CRITICAL] merchant A cannot view merchant B\'s data', ...)
  // test('[P0-CRITICAL] merchant cannot access admin endpoints', ...)
});
