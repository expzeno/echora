import rateLimit from 'express-rate-limit';
import { logger } from '../../lib/logger.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_MINUTE = 60 * 1000;

let redisStoreClient;
let RedisStoreClass;

export async function initRateLimitStore() {
  try {
    const mod = await import('rate-limit-redis');
    RedisStoreClass = mod.RedisStore;
    const { createClient } = await import('redis');
    const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await client.connect();
    redisStoreClient = client;
    logger.info('[RateLimit] Redis store connected');
  } catch (err) {
    logger.warn(`[RateLimit] Redis unavailable, using in-memory store: ${err.message}`);
  }

  // Pre-initialize limiter instances at startup (not lazily on first request).
  // express-rate-limit v7+ throws ERR_ERL_CREATED_IN_REQUEST_HANDLER if rateLimit()
  // is called inside a request handler.
  getAuthLimiter();
  getAuthIdentityLimiter();
  getApiLimiter();
}

function makeStore(prefix) {
  if (!redisStoreClient || !RedisStoreClass) return undefined;
  return new RedisStoreClass({ sendCommand: (...args) => redisStoreClient.sendCommand(args), prefix: `rl:${prefix}:` });
}

const identityKey = (req, _res) => {
  const data = req.body?.data || {};
  const raw = data.email || data.username;
  if (typeof raw === 'string' && raw.trim()) return `id:${raw.trim().toLowerCase()}`;
  return `anon:${req.ip}`;
};

let _authLimiter, _authIdentityLimiter, _apiLimiter;

function getAuthLimiter() {
  if (!_authLimiter) {
    _authLimiter = rateLimit({
      windowMs: FIFTEEN_MINUTES,
      max: (process.env.NODE_ENV === 'development' || process.env.DEPLOY_ENV === 'sandbox') ? 50 : 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: makeStore('auth'),
      message: { ok: false, message: 'Too many attempts. Please try again in 15 minutes.' },
    });
  }
  return _authLimiter;
}

function getAuthIdentityLimiter() {
  if (!_authIdentityLimiter) {
    _authIdentityLimiter = rateLimit({
      windowMs: FIFTEEN_MINUTES,
      max: process.env.TEST_RATE_LIMIT_MAX
        ? Number(process.env.TEST_RATE_LIMIT_MAX)
        : (process.env.NODE_ENV === 'development' || process.env.DEPLOY_ENV === 'sandbox') ? 200 : 10,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      keyGenerator: identityKey,
      store: makeStore('authId'),
      message: { ok: false, message: 'Too many failed attempts for this account. Please try again in 15 minutes.' },
    });
  }
  return _authIdentityLimiter;
}

function getApiLimiter() {
  if (!_apiLimiter) {
    _apiLimiter = rateLimit({
      windowMs: ONE_MINUTE,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        if (req.querier?.profileId) return `api:${req.querier.profileType}:${req.querier.profileId}`;
        return `api:${req.ip}`;
      },
      store: makeStore('api'),
      message: { ok: false, message: 'Too many requests. Slow down.' },
    });
  }
  return _apiLimiter;
}

export const authLimiter = (req, res, next) => getAuthLimiter()(req, res, next);
export const authIdentityLimiter = (req, res, next) => getAuthIdentityLimiter()(req, res, next);
export const apiLimiter = (req, res, next) => getApiLimiter()(req, res, next);
