import { logger } from '../../lib/logger.js';

const ERROR_STATUS = {
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  Gone: 410,
  TooManyRequests: 429,
};

export function handle(serviceFn, { paramOrder } = {}) {
  return async (req, res) => {
    try {
      const querier = req.querier || {};
      const data = req.method === 'GET'
        ? { ...(req.validatedData || req.query) }
        : req.validatedData || req.body?.data || req.body || {};
      const params = (paramOrder || []).map(k => {
        const v = req.params[k];
        const n = Number(v);
        return v !== '' && !isNaN(n) ? n : v;
      });

      const result = await serviceFn(querier, ...params, data);

      if (result?.ok === false) {
        const status = result.code ? (ERROR_STATUS[result.code] || 400) : 400;
        return res.status(status).json({ ...result, traceId: req.czTraceId });
      }

      res.json(result);
    } catch (err) {
      const status = ERROR_STATUS[err.constructor?.name] || 500;
      if (status === 500) {
        logger.error({ err, fn: serviceFn.name }, 'Unhandled error in handle()');
        return res.status(500).json({ ok: false, message: 'Internal server error', traceId: req.czTraceId });
      }
      res.status(status).json({ ok: false, message: err.message, traceId: req.czTraceId });
    }
  };
}
