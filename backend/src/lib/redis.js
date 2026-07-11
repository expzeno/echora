import Redis from 'ioredis';
import { logger } from './logger.js';
import { PFX } from './redisKeys.js';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on('error', (err) => logger.error({ err: err.message }, 'Redis connection error'));

export async function closeRedis() {
  await redis.quit();
}

export async function getOrSetRedis(key, ttlSeconds, fetchFn) {
  try {
    const fullKey = `${PFX}:${key}`;
    const cached = await redis.get(fullKey);
    if (cached !== null) return JSON.parse(cached);
    const value = await fetchFn();
    if (value !== null && value !== undefined) {
      await redis.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds);
    }
    return value;
  } catch (err) {
    logger.warn({ err: err.message }, '[Redis] getOrSetRedis failed, falling through to fetchFn');
    return fetchFn();
  }
}
