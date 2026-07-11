const defaults = [
  'https://ec.labzeno.com',        // web frontend
  'https://adminec.labzeno.com',    // admin portal (if applicable)
  'http://localhost:8100',                      // ionic serve
  'capacitor://localhost',                      // Capacitor iOS
  'https://localhost',                          // Capacitor Android (https scheme)
  'http://localhost',                           // Capacitor Android (default)
  'ionic://localhost',                          // legacy WebView
];

const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : [];

const allowedOrigins = new Set([...defaults, ...envOrigins]);

const isAllowedOrigin = (origin) => !origin || allowedOrigins.has(origin);

export const corsOptions = {
  origin: (origin, cb) => {
    if (isAllowedOrigin(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
};

// Intercept preflight (OPTIONS) requests from disallowed origins and reply 403
// directly, before cors() can hand an Error to the error handler (which would
// otherwise surface as a misleading 500).
export const corsPreflightGuard = (req, res, next) => {
  if (req.method === 'OPTIONS' && !isAllowedOrigin(req.headers.origin)) {
    return res.status(403).end();
  }
  next();
};
