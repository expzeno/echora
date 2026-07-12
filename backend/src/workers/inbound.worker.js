import { Worker } from 'bullmq';
import { redisConnection } from '../shared/redis.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { getIO } from '../modules/realtime/gateway.js';

// ─── Map WhatsApp Cloud API message.type → our MessageType enum ───
function mapMessageType(waType) {
  switch (waType) {
    case 'text': return 'text';
    case 'image': return 'image';
    case 'audio': return 'audio';
    case 'video': return 'video';
    case 'document': return 'document';
    case 'location': return 'location';
    case 'template': return 'template';
    default: return 'text';
  }
}

// Extract a human-readable body from the various WhatsApp message shapes.
function extractBody(message) {
  if (!message) return null;
  switch (message.type) {
    case 'text': return message.text?.body ?? null;
    case 'image': return message.image?.caption ?? null;
    case 'video': return message.video?.caption ?? null;
    case 'document': return message.document?.caption ?? message.document?.filename ?? null;
    case 'location':
      return message.location
        ? `${message.location.latitude},${message.location.longitude}`
        : null;
    case 'button': return message.button?.text ?? null;
    case 'interactive':
      return message.interactive?.button_reply?.title
        ?? message.interactive?.list_reply?.title
        ?? null;
    default: return null;
  }
}

// ─── Process one WhatsApp webhook payload ───
// Payload shape (Cloud API): entry[0].changes[0].value.{ metadata, contacts, messages }
async function processInbound(job) {
  const payload = job.data?.payload ?? job.data;
  const entries = payload?.entry ?? [];

  let processed = 0;

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const metadata = value.metadata ?? {};
      const messages = value.messages ?? [];
      const contactsMeta = value.contacts ?? [];

      if (!messages.length) continue; // status/read receipts — no message to persist

      // ── WhatsApp business number that received the message ──
      const phoneNumberId = metadata.phone_number_id ?? 'unknown';
      const displayPhone = metadata.display_phone_number ?? phoneNumberId;
      const whatsappNumber = await prisma.whatsappNumber.upsert({
        where: { phoneNumber: displayPhone },
        update: { phoneNumberId },
        create: {
          phoneNumber: displayPhone,
          displayName: displayPhone,
          phoneNumberId,
        },
      });

      for (const message of messages) {
        const waId = message.from; // sender's WhatsApp id (phone number, digits only)
        const profileName =
          contactsMeta.find((c) => c.wa_id === waId)?.profile?.name ?? null;

        // ── Upsert Contact (identified by WhatsApp id) ──
        const contact = await prisma.contact.upsert({
          where: { waId },
          update: {
            phoneNumber: waId,
            ...(profileName ? { profileName } : {}),
          },
          create: {
            waId,
            phoneNumber: waId,
            profileName,
          },
        });

        // ── Find an open conversation for this contact+number, else create one ──
        let conversation = await prisma.conversation.findFirst({
          where: {
            contactId: contact.id,
            whatsappNumberId: whatsappNumber.id,
            status: { in: ['open', 'pending'] },
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        const now = new Date();
        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              contactId: contact.id,
              whatsappNumberId: whatsappNumber.id,
              status: 'open',
              lastMessageAt: now,
            },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: now, status: 'open' },
          });
        }

        // ── Persist the inbound message (idempotent on waMessageId) ──
        const waMessageId = message.id ?? null;
        const existing = waMessageId
          ? await prisma.message.findUnique({ where: { waMessageId } })
          : null;

        if (existing) {
          logger.info(
            { waMessageId },
            '[inbound.worker] duplicate message, skipping'
          );
          continue;
        }

        const savedMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            contactId: contact.id,
            waMessageId,
            direction: 'inbound',
            type: mapMessageType(message.type),
            body: extractBody(message),
            status: 'received',
          },
        });

        // ── Emit realtime message:new to the conversation room ──
        // Clients join `conversation:${id}` via the gateway's join:conversation
        // handler; emit to the same room so subscribers get the live update.
        const io = getIO();
        if (io) {
          const payloadMsg = {
            conversationId: conversation.id,
            message: {
              id: savedMessage.id,
              conversationId: savedMessage.conversationId,
              direction: savedMessage.direction,
              type: savedMessage.type,
              content: savedMessage.body,
              status: savedMessage.status,
              createdAt: savedMessage.createdAt,
            },
          };
          io.to(`conversation:${conversation.id}`).emit('message:new', payloadMsg);
          // Also broadcast company-wide so background threads get badge updates.
          io.to('company:messages').emit('message:new', payloadMsg);
        }

        processed += 1;

        // TODO: assign an available agent to this conversation (round-robin /
        // least-busy) and emit a realtime `message:new` event to that agent.
        if (!conversation.assignedAgentId) {
          logger.info(
            { conversationId: conversation.id, contactId: contact.id },
            '[inbound.worker] TODO assign agent to unassigned conversation'
          );
        }
      }
    }
  }

  return { processed };
}

// ─── Worker ───
export const inboundWorker = new Worker('inbound-messages', processInbound, {
  connection: redisConnection,
  concurrency: 5,
});

inboundWorker.on('completed', (job, result) => {
  logger.info(
    { jobId: job.id, processed: result?.processed ?? 0 },
    '[inbound.worker] job completed'
  );
});

inboundWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, err: err?.message },
    '[inbound.worker] job failed'
  );
});

logger.info('[inbound.worker] started, listening on inbound-messages queue');
