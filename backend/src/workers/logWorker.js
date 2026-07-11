import dotenv from 'dotenv'; dotenv.config();

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import pino from 'pino';
import { PrismaClient } from '.prisma/logs-client';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildModelLogRow } from './buildModelLogRow.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { CyberZeno } = require(path.join(__dirname, '..', 'vendor', 'cyberzeno', 'index.cjs'));

const logger = pino({ level: process.env.LOG_LEVEL || 'info', base: { service: 'logWorker' } });

const cz = new CyberZeno({
  endpoint: process.env.CYBERZENO_ENDPOINT || 'https://cz.labzeno.com',
  apiKey: process.env.CYBERZENO_KEY,
  service: 'echora-log-worker',
  enabled: !!process.env.CYBERZENO_KEY,
});
cz.captureErrors();

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const logsPrisma = new PrismaClient({
  datasources: { db: { url: process.env.LOGS_DATABASE_URL } },
});

const worker = new Worker('modelLog', async (job) => {
  if (job.name !== 'modelLogBatch') return;
  const { rows } = job.data;
  const toInsert = rows.map(buildModelLogRow).filter(Boolean);
  if (toInsert.length === 0) return;
  await logsPrisma.modelLog.createMany({ data: toInsert });
}, {
  connection: redis,
  concurrency: Number(process.env.LOG_WORKER_CONCURRENCY ?? 3),
});

worker.on('failed', (job, err) => {
  logger.error({ err: err.message, jobId: job?.id }, 'Log worker job failed after retries');
});

logger.info('Log worker started, waiting for jobs');

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received — draining');
  await worker.close();
  await logsPrisma.$disconnect();
  await redis.quit();
  process.exit(0);
});
