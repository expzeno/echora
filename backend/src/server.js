import dotenv from 'dotenv'; dotenv.config();
import { loadSecrets } from './lib/secrets.js';
await loadSecrets();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import http from 'node:http';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { prisma, logsPrisma } from './lib/prisma.js';
import { redis, closeRedis } from './lib/redis.js';
import { corsOptions, corsPreflightGuard } from './shared/middleware/cors.js';
import { authLimiter, authIdentityLimiter, initRateLimitStore } from './shared/middleware/rateLimiters.js';
import { logger } from './lib/logger.js';
import { setCz } from './lib/czBridge.js';
import { flushModelLogBuffer, setMicroBufferReady } from './lib/logQueueProducer.js';
import { flushAccessLogBuffer } from './shared/helpers/accessLogHelper.js';
import { accessLogMiddleware } from './shared/middleware/accessLog.js';

// ─── WhatsApp webhook + realtime (Phase 1) ───
import { whatsappWebhookRoutes } from './modules/whatsapp/webhook.routes.js';
import { initGateway } from './modules/realtime/gateway.js';
// Side-effect import: boots the BullMQ inbound worker in-process (dev).
import './workers/inbound.worker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CyberZeno — vendored CJS SDK, loaded via createRequire
const require = createRequire(import.meta.url);
const { CyberZeno } = require(path.join(__dirname, 'vendor', 'cyberzeno', 'index.cjs'));
const PORT = process.env.PORT || 37600;

const app = express();

// ─── Trust first proxy hop (Nginx) so req.ip is the real client IP ───
app.set('trust proxy', 1);

// ─── Middleware (order matters: helmet → compression → cors → body → logger) ───
app.use(helmet());
app.use(compression());
app.use(corsPreflightGuard);
app.use(cors(corsOptions));

// ─── WhatsApp webhook — MUST mount before express.json ───
// The POST handler validates an HMAC over the raw request body (express.raw is
// attached locally on the route). Mounting here keeps the global JSON parser
// from consuming the stream first, which would break signature verification.
app.use('/api/v1/whatsapp/webhook', whatsappWebhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(accessLogMiddleware);

// ─── CyberZeno ───
const cz = new CyberZeno({
  endpoint: process.env.CYBERZENO_ENDPOINT || 'https://cz.labzeno.com',
  apiKey: process.env.CYBERZENO_KEY,
  service: 'echora-api',
  enabled: !!process.env.CYBERZENO_KEY,
  debug: process.env.NODE_ENV !== 'production',
  extractMetadata: (req) => ({
    profileType: req.querier?.profileType,
    profileId: req.querier?.profileId,
    trace_id: req.czTraceId,
  }),
});
cz.captureErrors();
setCz(cz);
app.use(cz.expressMiddleware());

// ─── Health endpoints (always mounted, all portals) ───
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

// ─── Routes ───
import { authRoutes } from './modules/auth/auth.routes.js';
import { customerAuthRoutes } from './modules/auth/customerAuth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { customerRoutes } from './modules/customer/customer.routes.js';
import { merchantRoutes } from './modules/merchant/merchant.routes.js';
import { conversationRoutes } from './modules/conversations/conversations.routes.js';
import { feedbackRoutes } from './modules/feedback/feedback.routes.js';
import { custPublicRoutes } from './modules/customer/custPublic.routes.js';
import { custProfileRoutes } from './modules/customer/custProfile.routes.js';
import { custNotificationRoutes } from './modules/customer/custNotification.routes.js';

// ─── Portal-based route mounting ───
// In production each portal runs as a separate PM2 process on its own port.
// Set PORTAL=admin|customer|merchant in each process env.
// In dev (PORTAL unset or 'all'), all portals mount on one process.
const portal = (process.env.PORTAL || 'all').toLowerCase();
const mountAll = portal === 'all';
logger.info(`[boot] PORTAL=${portal}`);

// Rate limiting — dual-bucket (IP + identity) on auth, IP-only on refresh
if (mountAll || portal === 'admin') {
  app.use('/company/access/login', authLimiter, authIdentityLimiter);
  app.use('/company/access/refreshToken', authLimiter);
}
if (mountAll || portal === 'customer') {
  app.use('/customer/access/login', authLimiter, authIdentityLimiter);
  app.use('/customer/access/refreshToken', authLimiter);
  app.use('/customer/access/forgetPassword', authLimiter, authIdentityLimiter);
  app.use('/customer/access/verifyOtpPasswordReset', authLimiter, authIdentityLimiter);
  app.use('/customer/public/register', authLimiter);
}

// Mount routes per portal
if (mountAll || portal === 'admin') {
  app.use('/company/access', authRoutes);
  app.use('/company/user', userRoutes);
  app.use('/company/dashboard', dashboardRoutes);
  app.use('/company/customer', customerRoutes);
  app.use('/company/merchant', merchantRoutes);
  app.use('/api/v1/conversations', conversationRoutes);
}
if (mountAll || portal === 'customer') {
  app.use('/customer/access', customerAuthRoutes);
  app.use('/customer/public', custPublicRoutes);
  app.use('/customer/profile', custProfileRoutes);
  app.use('/customer/notification', custNotificationRoutes);
}

// Feedback — dev/sandbox only, not portal-specific
if (process.env.NODE_ENV !== 'production') {
  app.use('/feedback', feedbackRoutes);
}

// Webhook — inline in dev, separate process in prod (INLINE_WEBHOOKS=false)
// Add webhook routes here when the project needs them:
// import { webhookRoutes } from './modules/webhook/webhook.routes.js';
// const inlineWebhooks = process.env.INLINE_WEBHOOKS !== 'false';
// if (inlineWebhooks && (mountAll || portal === 'webhook')) app.use(webhookRoutes);

// ─── Global error handler (must be after all routes) ───
app.use((err, req, res, next) => {
  logger.error({ err: err.message, stack: err.stack, path: req.originalUrl }, 'Unhandled error');
  res.status(500).json({ ok: false, message: 'Internal server error', traceId: req.czTraceId });
});

// ─── Log Worker ───
// Dev: spawned as child process from here (INLINE_WORKER=true or unset)
// Prod: separate PM2 app (INLINE_WORKER=false) — see ecosystem.config.cjs
let logWorkerProc;
function spawnLogWorker() {
  if (process.env.MODEL_LOG_HOOKS_ENABLED === 'false') return;
  if (process.env.INLINE_WORKER === 'false') {
    logger.info('[boot] INLINE_WORKER=false — log worker managed by PM2');
    return;
  }
  logWorkerProc = spawn(process.execPath, [path.join(__dirname, 'workers/logWorker.js')], {
    stdio: 'inherit',
    env: process.env,
  });
  logWorkerProc.on('exit', (code) => {
    logger.warn(`[logWorker] exited code=${code}, respawn in 5s`);
    setTimeout(spawnLogWorker, 5000);
  });
}

// ─── Init ───
async function init() {
  const mem = process.memoryUsage();
  const toMB = (b) => (b / 1024 / 1024).toFixed(1);
  logger.info(`[boot] heap: ${toMB(mem.heapUsed)}/${toMB(mem.heapTotal)} MB`);

  await prisma.$connect();
  await logsPrisma.$connect();
  logger.info('[boot] Prisma connected (main + logs DB)');

  await initRateLimitStore();

  setMicroBufferReady(true);
  spawnLogWorker();

  // ─── HTTP server + Socket.IO gateway ───
  // Socket.IO needs the raw http.Server (not app.listen's return) to attach.
  const httpServer = http.createServer(app);
  initGateway(httpServer);

  const startTime = Date.now();
  const server = httpServer.listen(PORT, () => {
    const bootMs = Date.now() - startTime;
    logger.info(`[boot] echora-api listening on :${PORT} (${bootMs}ms)`);
    if (process.send) process.send('ready');
  });

  // ─── Graceful shutdown ───
  const shutdown = async (signal) => {
    logger.info(`[shutdown] ${signal} received`);
    server.close();

    try { await flushModelLogBuffer(); } catch {}
    try { await flushAccessLogBuffer(); } catch {}

    if (logWorkerProc) {
      logWorkerProc.kill('SIGTERM');
      await new Promise((resolve) => {
        logWorkerProc.on('exit', resolve);
        setTimeout(resolve, 10000);
      });
    }

    await prisma.$disconnect();
    await logsPrisma.$disconnect();
    await closeRedis();
    logger.info('[shutdown] clean exit');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Global process error guards — log and keep alive (startup fatal errors still exit via init().catch)
process.on('unhandledRejection', (reason) => {
  // P1017 = Prisma "Server has closed the connection" — transient, Prisma auto-reconnects
  if (reason?.code === 'P1017') {
    logger.warn({ reason }, '[server] unhandledRejection — DB connection dropped, will reconnect');
    return;
  }
  logger.error({ err: reason }, '[server] Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.error({ err }, '[server] Uncaught exception');
});

init().catch((err) => {
  logger.error({ err }, '[boot] Fatal startup error');
  process.exit(1);
});
