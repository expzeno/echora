import { prisma } from '../../lib/prisma.js';
import { paginatedList } from '../../shared/utils/paginatedList.js';
import { sendPN } from '../../shared/helpers/pushNotificationHelper.js';
import { logger } from '../../lib/logger.js';

export class CustNotificationService {
  static async basicList(querier, data) {
    const where = { customerId: querier.profileId };
    const unreadCount = await prisma.notificationCust.count({ where: { ...where, status: 'unread' } });
    const result = await paginatedList('notificationCust', {
      where,
      options: { limit: Number(data?.limit) || 50, cursor: data?.cursor ? Number(data.cursor) : undefined, search: data?.search, order: { id: 'desc' } },
      searchFields: [],
    });
    return { ...result, unreadCount };
  }

  static async detail(querier, id) {
    const nc = await prisma.notificationCust.findFirst({
      where: { id, customerId: querier.profileId },
      include: { notification: { select: { id: true, title: true, body: true, publishedAt: true, via: true } } },
    });
    if (!nc) return { ok: false, message: 'Notification not found', code: 'NotFound' };

    if (nc.status !== 'read') {
      await prisma.notificationCust.update({ where: { id }, data: { status: 'read' } });
    }

    return { ok: true, detail: { ...nc, status: 'read' } };
  }

  static async markRead(querier, data) {
    const { notificationCustId } = data;
    if (!notificationCustId) return { ok: false, message: 'notificationCustId required' };

    const nc = await prisma.notificationCust.findFirst({
      where: { id: Number(notificationCustId), customerId: querier.profileId },
    });
    if (!nc) return { ok: false, message: 'Notification not found', code: 'NotFound' };

    await prisma.notificationCust.update({ where: { id: nc.id }, data: { status: 'read' } });
    return { ok: true };
  }

  static async markAllRead(querier) {
    await prisma.notificationCust.updateMany({
      where: { customerId: querier.profileId, status: 'unread' },
      data: { status: 'read' },
    });
    return { ok: true };
  }

  static async deviceStatus(querier) {
    const devices = await prisma.custDevice.findMany({
      where: { customerId: querier.profileId, status: 'active' },
      select: { id: true, device: true, agent: true, createdAt: true, updatedAt: true },
    });
    return { ok: true, count: devices.length, devices };
  }

  static async updateDevice(querier, data) {
    const { fcmToken, platform, agent } = data;
    if (!fcmToken || !platform) return { ok: false, message: 'FCM token and platform required' };

    let de = await prisma.custDevice.findFirst({
      where: { customerId: querier.profileId, token: fcmToken },
    });
    if (!de) {
      de = await prisma.custDevice.create({
        data: { customerId: querier.profileId, device: platform, token: fcmToken, agent },
      });
    }
    return { ok: true, deviceId: de.id };
  }

  static async sendTestPush(querier, data) {
    if (process.env.DEPLOY_ENV === 'production') {
      return { ok: false, message: 'Test push disabled in production', code: 'Forbidden' };
    }

    const devices = await prisma.custDevice.findMany({
      where: { customerId: querier.profileId, status: 'active' },
    });
    if (devices.length === 0) return { ok: false, message: 'No registered devices' };

    const results = [];
    for (const d of devices) {
      const resp = await sendPN(d.token, 'Test Push', data.body || 'This is a test notification', {
        target: 'notification',
        test: 'true',
      });
      results.push({ deviceId: d.id, device: d.device, result: resp });
    }

    return { ok: true, results };
  }

  static async deregisterDevice(querier, data) {
    const { fcmToken } = data;
    if (!fcmToken) return { ok: false, message: 'FCM token is required' };

    await prisma.custDevice.updateMany({
      where: { customerId: querier.profileId, token: fcmToken },
      data: { status: 'inactive' },
    });
    return { ok: true };
  }
}
