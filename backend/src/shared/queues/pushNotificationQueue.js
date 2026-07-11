import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../../lib/logger.js';

const QUEUE_NAME = 'ec-push-notification';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

const defaultJobOpts = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 86400, count: 1000 },
  removeOnFail: { age: 604800, count: 5000 },
};

export const pushQueue = new Queue(QUEUE_NAME, { connection, defaultJobOptions: defaultJobOpts });

export async function enqueueBulkPush(notificationId) {
  const job = await pushQueue.add('bulk-publish', { notificationId }, defaultJobOpts);
  logger.info({ jobId: job.id, notificationId }, 'Enqueued bulk push');
  return job;
}

export async function enqueueSinglePush({ customerId, title, body, data, actorId }) {
  const job = await pushQueue.add('single-push', { customerId, title, body, data, actorId }, defaultJobOpts);
  logger.info({ jobId: job.id, customerId }, 'Enqueued single push');
  return job;
}
