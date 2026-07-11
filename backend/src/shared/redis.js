import Redis from 'ioredis';
import { logger } from '../lib/logger.js';

// ─── Dedicated ioredis connection for BullMQ (queues + workers) ───
// BullMQ REQUIRES maxRetriesPerRequest: null on its connection, otherwise it
// throws on blocking commands (BRPOPLPUSH). Kept separate from lib/redis.js
// (the app cache client) so queue traffic and cache traffic don't interfere.
export const redisConnection = new Redis({
  host: process.env.ECHORA_REDIS_HOST || '127.0.0.1',
  port: Number(process.env.ECHORA_REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('error', (err) =>
  logger.error({ err: err.message }, '[bullmq-redis] connection error')
);
redisConnection.on('connect', () =>
  logger.info('[bullmq-redis] connected')
);
