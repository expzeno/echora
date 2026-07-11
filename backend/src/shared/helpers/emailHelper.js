import nodemailer from 'nodemailer';
import { logger } from '../../lib/logger.js';

const envSubjectPrefix = () => {
  const deployEnv = process.env.DEPLOY_ENV;
  if (deployEnv === 'production') return '';
  if (deployEnv === 'sandbox') return '[sandbox] ';
  return '[dev] ';
};

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
  return transporter;
}

export async function sendEmail(to, subject, html) {
  const from = process.env.SMTP_FROM || 'noreply@echora.com';
  const prefixedSubject = `${envSubjectPrefix()}${subject}`;
  try {
    const info = await getTransporter().sendMail({ from, to, subject: prefixedSubject, html });
    logger.info({ to, subject: prefixedSubject, messageId: info.messageId }, 'Email sent');
    return info;
  } catch (err) {
    logger.error({ to, subject: prefixedSubject, err: err.message }, 'Email send failed');
    throw err;
  }
}

export async function sendEmailWithAttachment(to, subject, html, attachments) {
  const from = process.env.SMTP_FROM || 'noreply@echora.com';
  const prefixedSubject = `${envSubjectPrefix()}${subject}`;
  try {
    const info = await getTransporter().sendMail({ from, to, subject: prefixedSubject, html, attachments });
    logger.info({ to, subject: prefixedSubject, messageId: info.messageId }, 'Email sent with attachment');
    return info;
  } catch (err) {
    logger.error({ to, subject: prefixedSubject, err: err.message }, 'Email send failed');
    throw err;
  }
}
