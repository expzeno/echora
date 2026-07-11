import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

const OTP_EXPIRY_MINUTES = 10;

function generateOtp() {
  // 6-digit numeric OTP via CSPRNG
  return String(crypto.randomInt(100000, 999999));
}

async function saveOtp(email, code, type) {
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await prisma.otpCode.create({ data: { email, codeHash, type, expiresAt } });
}

async function verifyOtpCode(email, code, type) {
  const record = await prisma.otpCode.findFirst({
    where: { email, type, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) return false;
  const match = await bcrypt.compare(code, record.codeHash);
  if (match) await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return match;
}

export class CustPublicService {
  // Register a new customer account. Sends an OTP to verify email.
  // Plug in your email service where indicated — remove the code log in production.
  static async register(data) {
    const { email, displayName, password } = data;
    if (!email || !displayName || !password) {
      return { ok: false, message: 'Email, display name, and password are required' };
    }
    if (password.length < 8) return { ok: false, message: 'Password must be at least 8 characters' };

    const exists = await prisma.customer.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return { ok: false, message: 'Email already registered' };

    const passwordHash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: { email: email.toLowerCase(), displayName, passwordHash, isActive: false },
      select: { id: true, email: true, displayName: true },
    });

    const otp = generateOtp();
    await saveOtp(customer.email, otp, 'register');

    // TODO: send OTP via your email service here, e.g.:
    // await emailService.sendOtp(customer.email, otp);
    // In dev, log to console so you can verify without a real email service:
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] OTP for ${customer.email}: ${otp}`);
    }

    return { ok: true, customerId: customer.id, message: 'OTP sent to your email' };
  }

  // Verify OTP after registration. Activates the account.
  static async verifyOtp(customerId, data) {
    const { otp } = data;
    if (!otp) return { ok: false, message: 'OTP is required' };

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return { ok: false, message: 'Customer not found' };
    if (customer.isActive) return { ok: false, message: 'Account already verified' };

    const valid = await verifyOtpCode(customer.email, otp, 'register');
    if (!valid) return { ok: false, message: 'Invalid or expired OTP' };

    await prisma.customer.update({ where: { id: customer.id }, data: { isActive: true } });
    return { ok: true, message: 'Account verified. You can now log in.' };
  }
}
