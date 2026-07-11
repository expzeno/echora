import { logsPrisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

let buffer = [];
let totalFlushed = 0;
let lastStatsTick = 0;
const FLUSH_INTERVAL_MS = 1000;
const FLUSH_SIZE_THRESHOLD = 500;
const STATS_INTERVAL_MS = 60000;

export function logAccess({ profileType, profileId, method, path, statusCode, ip, userAgent }) {
  buffer.push({
    profileType,
    profileId,
    method,
    path,
    statusCode,
    ip: ip || null,
    userAgent: userAgent?.substring(0, 200),
    createdAt: new Date(),
  });
  if (buffer.length >= FLUSH_SIZE_THRESHOLD) flush();
}

async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await logsPrisma.apiAccessLog.createMany({ data: batch });
    totalFlushed += batch.length;
  } catch (err) {
    logger.error({ err: err.message, batchSize: batch.length }, 'AccessLog flush failed — rows dropped');
  }
}

setInterval(() => {
  flush();
  const now = Date.now();
  if (totalFlushed > 0 && now - lastStatsTick >= STATS_INTERVAL_MS) {
    lastStatsTick = now;
    logger.info({ totalFlushed, bufferSize: buffer.length }, 'AccessLog stats');
  }
}, FLUSH_INTERVAL_MS);

export const flushAccessLogBuffer = flush;
