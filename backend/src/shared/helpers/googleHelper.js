import { OAuth2Client } from 'google-auth-library';
import { logger } from '../../lib/logger.js';

export const googleProfile = async (credential, sdk = 'web') => {
  const webClientId = process.env.GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID;
  const allAudiences = [webClientId, iosClientId, androidClientId].filter(Boolean);

  try {
    if (!credential) throw new Error('credential is null/undefined');
    const clientId = sdk === 'ios' ? iosClientId : webClientId;
    if (!clientId) throw new Error(`Google Client ID not configured for sdk=${sdk}`);

    logger.info({ sdk, credentialLength: credential?.length }, '[Google SSO] verifyIdToken attempt');

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: allAudiences });
    return ticket;
  } catch (err) {
    let tokenAud = null;
    try {
      const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64url').toString());
      tokenAud = payload.aud;
    } catch (_) {}
    logger.error({ err: err.message, sdk, tokenAud, expectedAudiences: allAudiences }, '[Google SSO] verifyIdToken FAILED');
    return null;
  }
};
