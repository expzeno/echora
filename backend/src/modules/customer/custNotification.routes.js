import { Router } from 'express';
import { z } from 'zod';
import { handle } from '../../shared/utils/handle.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticateCustomer } from '../../shared/middleware/authenticate.js';
import { CustNotificationService } from './custNotification.js';

const router = Router();
router.use(authenticateCustomer);

const updateDeviceSchema = z.object({
  fcmToken: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android', 'web']),
  agent: z.string().max(256).optional(),
});

const deregisterDeviceSchema = z.object({
  fcmToken: z.string().min(1).max(512),
});

const markReadSchema = z.object({
  notificationCustId: z.union([z.string(), z.number()]),
});

router.get('/list', handle(CustNotificationService.basicList));
router.get('/deviceStatus', handle(CustNotificationService.deviceStatus));
router.get('/:id', handle(CustNotificationService.detail, { paramOrder: ['id'] }));
router.post('/read', validate(markReadSchema), handle(CustNotificationService.markRead));
router.post('/markAllRead', handle(CustNotificationService.markAllRead));
router.post('/updateDevice', validate(updateDeviceSchema), handle(CustNotificationService.updateDevice));
router.post('/deregisterDevice', validate(deregisterDeviceSchema), handle(CustNotificationService.deregisterDevice));
router.post('/sendTestPush', handle(CustNotificationService.sendTestPush));

export const custNotificationRoutes = router;
