import { logAccess } from '../helpers/accessLogHelper.js';

export function accessLogMiddleware(req, res, next) {
  res.on('finish', () => {
    logAccess({
      profileType: req.querier?.profileType || null,
      profileId: req.querier?.profileId || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });
  next();
}
