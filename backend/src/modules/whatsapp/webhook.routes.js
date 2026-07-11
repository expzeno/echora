import { Router } from 'express';
import express from 'express';
import { verifyWebhook, receiveWebhook } from './webhook.controller.js';

// ─── WhatsApp Cloud API webhook ───
// Mounted at /api/v1/whatsapp/webhook (see server.js).
// POST needs the RAW body so we can validate the HMAC signature — express.json
// (mounted globally) would consume the stream and break signature verification,
// so we attach express.raw() locally on this route only.
export const whatsappWebhookRoutes = Router();

whatsappWebhookRoutes.get('/', verifyWebhook);

whatsappWebhookRoutes.post(
  '/',
  express.raw({ type: 'application/json' }),
  receiveWebhook
);
