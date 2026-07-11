import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../lib/prisma.js';
import { sendPN } from '../helpers/pushNotificationHelper.js';
import { logger } from '../../lib/logger.js';

const QUEUE_NAME = 'ec-push-notification';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

async function sendToDevices(notificationCust, devices, title, body, pnData) {
  let successCount = 0;
  const deliveryRecords = [];

  for (const cd of devices) {
    const resp = await sendPN(cd.token, title, body, pnData);
    if (resp?.error === 'token-not-registered') {
      await prisma.custDevice.delete({ where: { id: cd.id } });
      deliveryRecords.push({ deviceId: cd.id, status: 'token-expired' });
      continue;
    }
    if (resp) {
      successCount++;
      deliveryRecords.push({ deviceId: cd.id, status: 'sent', response: resp });
    } else {
      deliveryRecords.push({ deviceId: cd.id, status: 'failed' });
    }
  }

  const newStatus = successCount > 0 ? 'unread' : 'unsend';
  await prisma.notificationCust.update({
    where: { id: notificationCust.id },
    data: { status: newStatus, devices: deliveryRecords, firstReceivedAt: successCount > 0 ? new Date() : undefined },
  });

  return { successCount, totalDevices: devices.length };
}

async function processBulkPublish(job) {
  const { notificationId } = job.data;
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new Error(`Notification ${notificationId} not found`);

  const customers = await prisma.customer.findMany({
    where: { deletedAt: null, status: 'active' },
    include: { custDevices: { where: { status: 'active' } } },
  });

  let totalCustomers = 0;
  let totalDevices = 0;

  for (const cust of customers) {
    if (cust.custDevices.length === 0) continue;
    totalCustomers++;

    const nc = await prisma.notificationCust.create({
      data: {
        customerId: cust.id,
        notificationId,
        merchantId: notification.merchantId,
        status: 'unsend',
        data: notification.logic,
      },
    });

    const pnData = {
      target: notification.logic?.target || 'notification',
      notificationId: String(notificationId),
      notificationCustId: String(nc.id),
    };

    const result = await sendToDevices(nc, cust.custDevices, notification.title, notification.body, pnData);
    totalDevices += result.totalDevices;
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'published', publishedAt: new Date(), totalTargetedCustomers: totalCustomers, totalTargetedDevices: totalDevices },
  });

  logger.info({ notificationId, totalCustomers, totalDevices }, 'Bulk push complete');
}

async function processSinglePush(job) {
  const { customerId, title, body, data: pnData, actorId } = job.data;

  const notification = await prisma.notification.create({
    data: {
      title,
      body,
      status: 'published',
      target: 'single',
      via: 'system',
      logic: { target: 'single' },
      publishedAt: new Date(),
      pushById: actorId,
      totalTargetedCustomers: 1,
    },
  });

  const nc = await prisma.notificationCust.create({
    data: { customerId, notificationId: notification.id, status: 'unsend', data: pnData },
  });

  const devices = await prisma.custDevice.findMany({
    where: { customerId, status: 'active' },
  });

  if (devices.length > 0) {
    const enrichedData = { ...pnData, notificationId: String(notification.id), notificationCustId: String(nc.id) };
    await sendToDevices(nc, devices, title, body, enrichedData);
  }

  logger.info({ customerId, notificationId: notification.id }, 'Single push complete');
}

export function startPushWorker() {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    if (job.name === 'bulk-publish') return processBulkPublish(job);
    if (job.name === 'single-push') return processSinglePush(job);
    throw new Error(`Unknown job name: ${job.name}`);
  }, { connection, concurrency: 5 });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, err: err.message }, 'Push job failed');
  });

  logger.info('Push notification worker started');
  return worker;
}
