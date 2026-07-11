import Redis from 'ioredis';
import { logger } from './logger.js';
import { PFX } from './redisKeys.js';

// REDIS_QUEUE_PREFIX is set by the pipeline (must include env, e.g. "pz-sandbox").
// Falls back to the shared env-aware PFX so dev never collides with sandbox/production.
const prefix = process.env.REDIS_QUEUE_PREFIX || PFX;

export const queueConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

queueConnection.on('error', (err) => logger.error({ err: err.message }, 'Queue Redis error'));

export { prefix as queuePrefix };
