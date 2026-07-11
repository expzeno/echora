import pino from 'pino';
import { czError } from './czBridge.js';

const _pino = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: process.env.npm_package_name || 'echora-api',
    pid: process.pid,
  },
});

export const logger = {
  trace: (...args) => _pino.trace(...args),
  debug: (...args) => _pino.debug(...args),
  info:  (...args) => _pino.info(...args),
  warn:  (...args) => _pino.warn(...args),
  error: (...args) => {
    _pino.error(...args);
    const [first, second] = args;
    let msg, meta;
    if (typeof first === 'string') {
      msg = first;
    } else if (first instanceof Error) {
      msg = first.message;
      meta = { stack: first.stack?.substring(0, 1000), type: first.constructor?.name };
    } else if (first && typeof first === 'object') {
      msg = typeof second === 'string' ? second : (first.err?.message || first.message || 'error');
      const src = first.err || first;
      if (src instanceof Error) meta = { stack: src.stack?.substring(0, 1000), type: src.constructor?.name };
    }
    czError(msg || 'error', meta);
  },
  fatal: (...args) => _pino.fatal(...args),
  child: (...args) => _pino.child(...args),
};
