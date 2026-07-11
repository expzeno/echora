import appleSignin from 'apple-signin-auth';
import { logger } from '../../lib/logger.js';

export const appleProfile = async (idToken) => {
  const audience = process.env.APPLE_APP_BUNDLE_ID;
  try {
    if (!audience) throw new Error('APPLE_APP_BUNDLE_ID not set');
    const obj = await appleSignin.verifyIdToken(idToken, { audience, ignoreExpiration: false });
    return { payload: obj };
  } catch (err) {
    logger.error({ err: err.message }, '[Apple SSO] verifyIdToken FAILED');
    return null;
  }
};
