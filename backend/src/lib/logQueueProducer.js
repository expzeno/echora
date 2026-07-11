import { Queue } from 'bullmq';
import { queueConnection } from './queueConnection.js';
import { logger } from './logger.js';

const prefix = process.env.REDIS_QUEUE_PREFIX || 'echora';
export const logQueue = new Queue('modelLog', { connection: queueConnection, prefix: `bull:${prefix}` });

export let microBuffer = [];
let ready = false;
let totalEnqueued = 0;

const FLUSH_INTERVAL_MS = 1000;
const FLUSH_SIZE_THRESHOLD = 500;
const MAX_BUFFER_SIZE = 10000;

export function setMicroBufferReady(val) { ready = val; }

async function flushToQueue() {
  if (!ready || microBuffer.length === 0) return;
  const batch = microBuffer;
  microBuffer = [];
  try {
    await logQueue.add('modelLogBatch', { rows: batch }, {
      removeOnComplete: true,
      removeOnFail: { age: 86400 },
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    totalEnqueued += batch.length;
  } catch (err) {
    logger.error({ err: err.message, batchSize: batch.length }, 'ModelLog queue.add failed — re-buffering');
    microBuffer.unshift(...batch);
    if (microBuffer.length > MAX_BUFFER_SIZE) {
      const dropped = microBuffer.length - (MAX_BUFFER_SIZE / 2);
      logger.error({ dropped }, 'ModelLog microBuffer overflow — dropping oldest');
      microBuffer = microBuffer.slice(-MAX_BUFFER_SIZE / 2);
    }
  }
}

setInterval(flushToQueue, FLUSH_INTERVAL_MS);

setInterval(() => {
  if (totalEnqueued > 0) {
    logger.info({ totalEnqueued, bufferSize: microBuffer.length }, 'ModelLog stats');
  }
}, 60000);

export function pushToMicroBuffer(raw) {
  microBuffer.push(raw);
  if (microBuffer.length >= FLUSH_SIZE_THRESHOLD) flushToQueue();
}

export const flushModelLogBuffer = flushToQueue;
