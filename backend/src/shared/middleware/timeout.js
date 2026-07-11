const DEFAULT_TIMEOUT = 30000;

export function timeout(ms = DEFAULT_TIMEOUT) {
  return (req, res, next) => {
    req.setTimeout(ms, () => {
      if (!res.headersSent) {
        res.status(408).json({ ok: false, message: 'Request timeout' });
      }
    });
    next();
  };
}
