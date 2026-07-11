/**
 * CyberZeno Node.js SDK (vendored copy)
 * Source: /home/server_tridentity_me/projects/cyberzeno/sdks/node
 */

class CyberZeno {
  constructor(options = {}) {
    this.endpoint = (options.endpoint || '').replace(/\/$/, '');
    this.apiKey = options.apiKey || '';
    this.service = options.service || 'unknown';
    this.host = options.host || require('os').hostname();
    this.batchSize = options.batchSize || 50;
    this.flushInterval = options.flushInterval || 5000;
    this.flushTimeoutMs = options.flushTimeoutMs || 5000;
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.enabled = options.enabled !== false;
    this.debug = options.debug || false;
    this.gzip = options.gzip !== false;
    this.sampleRate = Math.max(0, Math.min(1, options.sampleRate ?? 1));
    this.normalizeEndpoint = options.normalizeEndpoint || defaultNormalizeEndpoint;
    this.redact = options.redact || null;
    this.onError = options.onError || ((err) => this.debug && console.error('[cyberzeno]', err.message));

    this._queue = [];
    this._timer = null;
    this._flushing = false;
    this._dropped = 0;
    this._consecutiveFailures = 0;
    this._backoffUntil = 0;
    this._shutdownPromise = null;

    if (this.enabled && this.endpoint && this.apiKey) {
      this._timer = setInterval(() => this.flush(), this.flushInterval);
      if (this._timer.unref) this._timer.unref();
    }
  }

  _enqueue(entry) {
    if (!this.enabled) return;
    if (this.sampleRate < 1 && entry.level !== 'error' && entry.level !== 'warn') {
      if (Math.random() > this.sampleRate) return;
    }
    let e = {
      timestamp: new Date().toISOString(),
      service: this.service,
      host: this.host,
      ...entry
    };
    if (this.redact) {
      try { e = this.redact(e); } catch (_) {}
    }
    while (this._queue.length >= this.maxQueueSize) {
      this._queue.shift();
      this._dropped++;
    }
    this._queue.push(e);
    if (this._queue.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this._flushing || this._queue.length === 0) return;
    if (Date.now() < this._backoffUntil) return;

    this._flushing = true;
    const batch = this._queue.splice(0, 1000);
    const payload = { logs: batch };
    if (this._dropped > 0) {
      payload.dropped_before = this._dropped;
      this._dropped = 0;
    }

    try {
      const jsonBody = JSON.stringify(payload);
      const headers = { 'Content-Type': 'application/json', 'x-api-key': this.apiKey };
      let body = jsonBody;

      if (this.gzip && jsonBody.length > 1024) {
        try {
          const zlib = require('zlib');
          body = zlib.gzipSync(jsonBody);
          headers['Content-Encoding'] = 'gzip';
        } catch (_) {
          body = jsonBody;
        }
      }

      const res = await fetch(`${this.endpoint}/api/ingest/logs`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(this.flushTimeoutMs)
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      this._consecutiveFailures = 0;
      this._backoffUntil = 0;
      if (this.debug) console.log(`[cyberzeno] flushed ${batch.length} logs`);
    } catch (err) {
      this._queue.unshift(...batch);
      this._consecutiveFailures++;
      const delay = Math.min(60000, this.flushInterval * Math.pow(2, this._consecutiveFailures - 1));
      this._backoffUntil = Date.now() + delay;
      this.onError(err);
    } finally {
      this._flushing = false;
    }
  }

  info(message, metadata) { this._enqueue({ level: 'info', message, metadata }); }
  warn(message, metadata) { this._enqueue({ level: 'warn', message, metadata }); }
  error(message, metadata) { this._enqueue({ level: 'error', message, metadata }); }

  log(level, message, metadata) { this._enqueue({ level, message, metadata }); }

  expressMiddleware(options = {}) {
    const ignorePaths = new Set(options.ignorePaths || ['/health', '/healthz', '/ready', '/favicon.ico']);
    const cz = this;

    return function cyberZenoMiddleware(req, res, next) {
      if (ignorePaths.has(req.path)) return next();

      const start = Date.now();
      const traceId = req.headers['x-trace-id'] || req.headers['x-request-id'] || generateId();
      req.czTraceId = traceId;
      res.setHeader('x-trace-id', traceId);

      const originalEnd = res.end;
      res.end = function (...args) {
        res.end = originalEnd;
        const result = res.end(...args);

        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        const routePath = req.route?.path;
        const rawPath = routePath
          ? (req.baseUrl || '') + routePath
          : req.originalUrl || req.path || req.url;
        const endpoint = cz.normalizeEndpoint(rawPath);

        cz._enqueue({
          level,
          message: `${req.method} ${endpoint} ${res.statusCode} ${duration}ms`,
          method: req.method,
          endpoint,
          status_code: res.statusCode,
          duration_ms: duration,
          trace_id: traceId,
          metadata: {
            ip: req.ip || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent']?.substring(0, 200),
            ...(options.extractMetadata ? options.extractMetadata(req, res) : {})
          }
        });

        return result;
      };
      next();
    };
  }

  fastifyPlugin() {
    const cz = this;
    return async function cyberZenoPlugin(fastify, options) {
      const ignorePaths = new Set(options?.ignorePaths || ['/health', '/healthz', '/ready', '/favicon.ico']);

      fastify.addHook('onRequest', async (req, reply) => {
        req.czStart = Date.now();
        req.czTraceId = req.headers['x-trace-id'] || req.headers['x-request-id'] || generateId();
        reply.header('x-trace-id', req.czTraceId);
      });

      fastify.addHook('onResponse', async (req, reply) => {
        const path = req.routeOptions?.url || req.url;
        if (ignorePaths.has(path)) return;

        const duration = Date.now() - (req.czStart || Date.now());
        const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';
        const endpoint = cz.normalizeEndpoint(path);

        cz._enqueue({
          level,
          message: `${req.method} ${endpoint} ${reply.statusCode} ${duration}ms`,
          method: req.method,
          endpoint,
          status_code: reply.statusCode,
          duration_ms: duration,
          trace_id: req.czTraceId,
          metadata: {
            ip: req.ip,
            user_agent: req.headers['user-agent']?.substring(0, 200)
          }
        });
      });
    };
  }

  captureErrors(options = {}) {
    const cz = this;
    const mode = options.installHandler || 'append';
    const addListener = mode === 'prepend' ? 'prependListener' : 'on';

    if (mode !== 'manual') {
      process[addListener]('uncaughtException', (err) => {
        cz.error(`Uncaught Exception: ${err.message}`, {
          stack: err.stack?.substring(0, 2000),
          type: err.constructor.name
        });
        cz.shutdown().finally(() => process.exit(1));
      });
      process[addListener]('unhandledRejection', (reason) => {
        const msg = reason instanceof Error ? reason.message : String(reason);
        const stack = reason instanceof Error ? reason.stack?.substring(0, 2000) : undefined;
        cz.error(`Unhandled Rejection: ${msg}`, { stack, type: 'UnhandledRejection' });
      });
    }

    if (options.handleSignals !== false) {
      const onSignal = (sig) => {
        if (cz.debug) console.log(`[cyberzeno] ${sig} received, flushing…`);
        cz.shutdown().finally(() => process.exit(0));
      };
      process.on('SIGTERM', () => onSignal('SIGTERM'));
      process.on('SIGINT', () => onSignal('SIGINT'));
    }

    return this;
  }

  async shutdown() {
    if (this._shutdownPromise) return this._shutdownPromise;
    this._shutdownPromise = this._doShutdown();
    return this._shutdownPromise;
  }

  async _doShutdown() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this._backoffUntil = 0;
    while (this._queue.length > 0 && !this._flushing) {
      await this.flush();
      if (this._queue.length > 0 && this._flushing) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function defaultNormalizeEndpoint(path) {
  return path
    .replace(/\?.*$/, '')
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/[0-9a-f]{24}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

module.exports = { CyberZeno };
