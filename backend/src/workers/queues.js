import { Queue } from 'bullmq';
import { redisConnection } from '../shared/redis.js';

// ─── BullMQ queues ───
// inboundQueue  — WhatsApp webhook events land here, processed by inbound.worker.js
// outboundQueue — agent replies to be delivered to WhatsApp (worker TBD, Phase 2)
const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 24 * 3600 },
};

export const inboundQueue = new Queue('inbound-messages', {
  connection: redisConnection,
  defaultJobOptions,
});

export const outboundQueue = new Queue('outbound-messages', {
  connection: redisConnection,
  defaultJobOptions,
});
