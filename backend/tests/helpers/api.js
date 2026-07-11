import axios from 'axios';

const BASE_URL = process.env.TEST_API_BASE || 'http://localhost:37600';

const client = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true,
  timeout: 15000,
});

export function freshIp() {
  const o = () => Math.floor(Math.random() * 254) + 1;
  return `10.${o()}.${o()}.${o()}`;
}

function headers(token) {
  const h = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': freshIp(),
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

const TOKEN_CACHE = {};

const CREDENTIALS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@demo.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
  },
  customer: {
    email: process.env.TEST_CUSTOMER_EMAIL || 'alice@example.com',
    password: process.env.TEST_CUSTOMER_PASSWORD || 'customer123',
  },
};

export async function getToken(role = 'admin') {
  if (TOKEN_CACHE[role]) return TOKEN_CACHE[role];

  const cred = CREDENTIALS[role];
  if (!cred) throw new Error(`Unknown role: ${role}`);

  const endpoint = role === 'customer' ? '/customer/access/login' : '/company/access/login';
  const body = role === 'customer'
    ? { data: { email: cred.email, password: cred.password } }
    : { data: { email: cred.email, password: cred.password } };
  const res = await client.post(endpoint, body, { headers: headers() });
  if (res.status !== 200) throw new Error(`Login failed for ${role}: ${res.status}`);

  const token = res.data.token?.token || res.data.token;
  TOKEN_CACHE[role] = token;
  return token;
}

export function getCredentials(role) {
  return CREDENTIALS[role] || null;
}

export const api = {
  get: (path, token) => client.get(path, { headers: headers(token) }),
  post: (path, body, token) => client.post(path, body, { headers: headers(token) }),
  put: (path, body, token) => client.put(path, body, { headers: headers(token) }),
  del: (path, token) => client.delete(path, { headers: headers(token) }),
};
