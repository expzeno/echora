import { createRequire } from 'module';
import { logger } from '../../lib/logger.js';

const require = createRequire(import.meta.url);

let messaging = null;

try {
  const serviceAccount = require('../../../serviceAccountKey.json');
  const { initializeApp } = await import('firebase-admin/app');
  const { getMessaging } = await import('firebase-admin/messaging');
  const admin = (await import('firebase-admin')).default;
  initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  messaging = getMessaging();
  logger.info('[FCM] Firebase push notifications enabled');
} catch {
  logger.warn('[FCM] serviceAccountKey.json not found — push notifications disabled. Add the file to enable FCM.');
}

export const sendPN = async (deviceFcmToken, title, body, data) => {
  if (!messaging) {
    logger.warn('[FCM] sendPN called but Firebase not initialized — skipping');
    return null;
  }
  const message = {
    notification: { title, body },
    token: deviceFcmToken,
    data,
  };
  try {
    const response = await messaging.send(message);
    return response;
  } catch (error) {
    logger.error('[FCM] Error:', error);
    if (error?.errorInfo?.code === 'messaging/registration-token-not-registered') {
      return { error: 'token-not-registered' };
    }
    return null;
  }
};
