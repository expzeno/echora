import nodemailer from 'nodemailer';
import { logger } from './logger.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
  return transporter;
}

export async function sendEmail(to, subject, html) {
  const from = process.env.SMTP_FROM || 'noreply@echora.com';
  try {
    const info = await getTransporter().sendMail({ from, to, subject, html });
    logger.info({ to, subject, messageId: info.messageId }, 'Email sent');
    return info;
  } catch (err) {
    logger.error({ to, subject, err: err.message }, 'Email send failed');
    throw err;
  }
}
