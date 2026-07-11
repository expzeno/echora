import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { cacheJwt, invalidateJwt } from '../../lib/jwtCache.js';
import { googleProfile } from '../../shared/helpers/googleHelper.js';
import { appleProfile } from '../../shared/helpers/appleHelper.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

let privateKey = process.env.JWT_PRIVATE_KEY || null;
if (!privateKey) {
  try { privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem'); }
  catch { /* JWT private key not loaded — login will fail until keys are configured */ }
}

function signToken(payload, expiresIn) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, privateKey, { algorithm: 'RS256', expiresIn });
}

function profilePayload(customer) {
  return { id: customer.id, email: customer.email, displayName: customer.displayName || customer.email, phoneNumber: customer.phoneNumber };
}

export class CustomerAuthService {
  static async _issueTokens(querier, customer) {
    const tokenPayload = { id: customer.id, profileType: 'customer', jwtVersion: customer.jwtVersion };
    const accessToken = signToken(tokenPayload, ACCESS_EXPIRY);
    const refreshToken = signToken({ ...tokenPayload, type: 'refresh' }, REFRESH_EXPIRY);
    await cacheJwt(accessToken, { ...tokenPayload, jti: jwt.decode(accessToken).jti });
    await prisma.session.create({
      data: {
        customerId: customer.id,
        token: accessToken,
        refreshToken,
        portal: 'customer',
        ip: querier.ip || null,
        userAgent: querier.userAgent?.substring(0, 200),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return { token: accessToken, expiresIn: ACCESS_EXPIRY, refreshToken, refreshExpiresIn: REFRESH_EXPIRY };
  }

  static async login(querier, data) {
    const email = data.email || data.username;
    const { password } = data;
    if (!email || !password) return { ok: false, message: 'Email and password required' };

    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || customer.deletedAt) return { ok: false, message: 'Invalid credentials' };
    if (!customer.isActive) return { ok: false, message: 'Account deactivated' };

    if (customer.lockedUntil && customer.lockedUntil > new Date()) {
      const mins = Math.ceil((customer.lockedUntil - Date.now()) / 60000);
      return { ok: false, message: `Account locked. Try again in ${mins} minutes` };
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) {
      const attempts = customer.failedAttempts + 1;
      const lockout = attempts >= MAX_FAILED_ATTEMPTS
        ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60000), failedAttempts: 0 }
        : { failedAttempts: attempts };
      await prisma.customer.update({ where: { id: customer.id }, data: lockout });
      return { ok: false, message: 'Invalid credentials' };
    }

    if (customer.failedAttempts > 0) {
      await prisma.customer.update({ where: { id: customer.id }, data: { failedAttempts: 0, lockedUntil: null } });
    }

    const token = await CustomerAuthService._issueTokens(querier, customer);
    return { ok: true, token, profile: profilePayload(customer) };
  }

  static async refreshToken(querier, data) {
    const { refreshToken } = data;
    if (!refreshToken) return { ok: false, message: 'Refresh token required', code: 'BadRequest' };

    const session = await prisma.session.findFirst({ where: { refreshToken, isActive: true, portal: 'customer' } });
    if (!session) return { ok: false, message: 'Invalid refresh token', code: 'Unauthorized' };

    const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
    if (!customer || customer.deletedAt || !customer.isActive) return { ok: false, message: 'Account unavailable', code: 'Unauthorized' };

    const tokenPayload = { id: customer.id, profileType: 'customer', jwtVersion: customer.jwtVersion };
    const newAccessToken = signToken(tokenPayload, ACCESS_EXPIRY);
    await cacheJwt(newAccessToken, { ...tokenPayload, jti: jwt.decode(newAccessToken).jti });

    await invalidateJwt(session.token);
    await prisma.session.update({
      where: { id: session.id },
      data: { token: newAccessToken, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });

    return { ok: true, token: newAccessToken, expiresIn: ACCESS_EXPIRY };
  }

  static async profile(querier) {
    const customer = await prisma.customer.findUnique({ where: { id: querier.profileId } });
    if (!customer || customer.deletedAt) return { ok: false, message: 'Account not found', code: 'NotFound' };
    return { ok: true, profile: profilePayload(customer) };
  }

  static async logout(querier) {
    if (querier.sessionId) {
      await prisma.session.update({ where: { id: querier.sessionId }, data: { isActive: false } });
    }
    return { ok: true };
  }

  // Step 1: customer requests password reset — generates OTP and sends to email
  static async forgetPassword(querier, data) {
    const { email } = data;
    // Enumerate-safe: always return ok:true regardless of whether email exists
    const customer = await prisma.customer.findUnique({ where: { email: email?.toLowerCase() } });
    if (customer && customer.isActive && !customer.deletedAt) {
      const otp = String(crypto.randomInt(100000, 999999));
      const codeHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await prisma.otpCode.create({ data: { email: customer.email, codeHash, type: 'passwordReset', expiresAt } });
      // TODO: send OTP via your email service here
      if (process.env.NODE_ENV !== 'production') console.log(`[DEV] Reset OTP for ${email}: ${otp}`);
    }
    return { ok: true, message: 'If that email exists, a reset code has been sent.' };
  }

  // SSO social login — 3-case account linking (see CODING_STANDARD §23)
  static async ssoSocialLogin(querier, data, social) {
    const { credential, sdk, profile } = data;

    let ticket;
    if (social === 'google') {
      ticket = await googleProfile(credential, sdk);
      if (!ticket?.payload) return { ok: false, message: 'Unable to retrieve Google profile' };
    } else if (social === 'apple') {
      ticket = await appleProfile(credential);
      if (!ticket?.payload) return { ok: false, message: 'Unable to retrieve Apple profile' };
    } else {
      return { ok: false, message: `Unsupported SSO provider: ${social}` };
    }

    const { sub, email, email_verified } = ticket.payload;
    if (!email_verified) return { ok: false, message: 'Email not verified by provider' };
    const displayName = ticket.payload.given_name || profile?.givenName || email;

    // Case 1: SSO record exists → return existing customer
    const existingSSO = await prisma.customerSSO.findUnique({
      where: { provider_uid: { provider: social, uid: sub } },
      include: { customer: true },
    });

    let customer = existingSSO?.customer ?? null;

    if (!existingSSO) {
      customer = await prisma.customer.findUnique({ where: { email } });

      if (!customer) {
        // Case 2: no record → create new customer + SSO link
        const randomHash = await bcrypt.hash(crypto.randomUUID(), 10);
        customer = await prisma.customer.create({
          data: { email, passwordHash: randomHash, displayName, status: 'active', emailVerified: true },
        });
      } else if (customer.status === 'pending') {
        // Case 3b: registered but OTP never verified — SSO proves email ownership.
        // Activate the account and invalidate the unverified password so it can't be used.
        const randomHash = await bcrypt.hash(crypto.randomUUID(), 10);
        await prisma.customer.update({
          where: { id: customer.id },
          data: { status: 'active', emailVerified: true, passwordHash: randomHash },
        });
        customer = { ...customer, status: 'active', emailVerified: true };
      }
      // Case 3a: active customer → link SSO silently, no other changes

      await prisma.customerSSO.create({
        data: { customerId: customer.id, provider: social, uid: sub },
      });
    }

    if (customer.deletedAt) return { ok: false, message: 'Account not found' };
    if (!customer.isActive || customer.status === 'suspended' || customer.status === 'banned') {
      return { ok: false, message: 'Account is not accessible' };
    }

    const token = await CustomerAuthService._issueTokens(querier, customer);
    return { ok: true, token, profile: profilePayload(customer) };
  }

  // Step 2: customer submits OTP + new password
  static async verifyOtpPasswordReset(querier, data) {
    const { email, otp, newPassword } = data;
    const customer = await prisma.customer.findUnique({ where: { email: email?.toLowerCase() } });
    if (!customer || customer.deletedAt) return { ok: false, message: 'Invalid request' };

    const record = await prisma.otpCode.findFirst({
      where: { email: customer.email, type: 'passwordReset', usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return { ok: false, message: 'Invalid or expired OTP' };

    const match = await bcrypt.compare(otp, record.codeHash);
    if (!match) return { ok: false, message: 'Invalid or expired OTP' };

    await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash, jwtVersion: { increment: 1 }, failedAttempts: 0, lockedUntil: null },
    });
    return { ok: true, message: 'Password reset. Please log in with your new password.' };
  }
}
