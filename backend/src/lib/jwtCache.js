import jwt from 'jsonwebtoken';
import { redis } from './redis.js';
import { keys } from './redisKeys.js';

const PROFILE_TTL = 600; // 10 min — safety net for stale profile data
const JWT_BUFFER = 300;  // 5 min buffer past token expiry

function jwtTtl(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded?.exp) return null;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000) + JWT_BUFFER;
    return ttl > 0 ? ttl : null;
  } catch { return null; }
}

export async function cacheJwt(token, payload) {
  const ttl = jwtTtl(token);
  if (!ttl) return;
  await redis.set(keys.jwt(token), JSON.stringify(payload), 'EX', ttl);
}

export async function getCachedJwt(token) {
  const cached = await redis.get(keys.jwt(token));
  return cached ? JSON.parse(cached) : null;
}

// Positive-only caching: never cache failed lookups to prevent cache poisoning
export async function invalidateJwt(token) {
  await redis.del(keys.jwt(token));
}

export async function cacheProfile(profileType, profileId, profile) {
  await redis.set(keys.profile(profileType, profileId), JSON.stringify(profile), 'EX', PROFILE_TTL);
}

export async function getCachedProfile(profileType, profileId) {
  const cached = await redis.get(keys.profile(profileType, profileId));
  return cached ? JSON.parse(cached) : null;
}

export async function invalidateProfile(profileType, profileId) {
  await redis.del(keys.profile(profileType, profileId));
}
