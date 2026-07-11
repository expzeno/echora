import crypto from 'node:crypto';
import { inboundQueue } from '../../workers/queues.js';
import { logger } from '../../lib/logger.js';

// ─── GET /  — Meta webhook verification handshake ───
// Meta calls this once when you register the callback URL. We echo hub.challenge
// back as plain text if the mode + verify token match.
export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.ECHORA_WA_VERIFY_TOKEN) {
    logger.info('[wa-webhook] verification succeeded');
    return res.status(200).send(challenge);
  }

  logger.warn({ mode }, '[wa-webhook] verification failed');
  return res.sendStatus(403);
}

// ─── POST /  — incoming WhatsApp events ───
// Body is raw Buffer (express.raw). We validate the X-Hub-Signature-256 HMAC,
// enqueue non-empty payloads, and ACK 200 immediately so Meta doesn't retry.
export async function receiveWebhook(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? '');
  const appSecret = process.env.ECHORA_WA_APP_SECRET;

  // ── Verify signature (constant-time) ──
  if (appSecret) {
    const signature = req.get('X-Hub-Signature-256') || '';
    const expected =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    const valid =
      sigBuf.length === expBuf.length &&
      crypto.timingSafeEqual(sigBuf, expBuf);

    if (!valid) {
      logger.warn('[wa-webhook] invalid X-Hub-Signature-256');
      return res.sendStatus(401);
    }
  }

  // ── Parse ──
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8') || '{}');
  } catch (err) {
    logger.warn({ err: err.message }, '[wa-webhook] invalid JSON body');
    return res.sendStatus(400);
  }

  // ── Enqueue only if there is at least one entry to process ──
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  if (entries.length > 0) {
    try {
      await inboundQueue.add('whatsapp-inbound', { payload });
      logger.info({ entries: entries.length }, '[wa-webhook] enqueued inbound');
    } catch (err) {
      // Never fail the webhook on queue errors — Meta would retry-storm us.
      logger.error({ err: err.message }, '[wa-webhook] failed to enqueue');
    }
  }

  // Always ACK fast.
  return res.sendStatus(200);
}
