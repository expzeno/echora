import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { cacheJwt, invalidateJwt } from '../../lib/jwtCache.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '24h';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

let privateKey = process.env.JWT_PRIVATE_KEY || null;
if (!privateKey) {
  try { privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem'); }
  catch { /* JWT private key not loaded — login will return 500 until keys are configured */ }
}

function signToken(payload, expiresIn) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, privateKey, { algorithm: 'RS256', expiresIn });
}

function profilePayload(user) {
  return { id: user.id, email: user.email, displayName: user.displayName || user.email, role: user.role };
}

export class AuthService {
  static async login(querier, data) {
    const email = data.email || data.username;
    const { password } = data;
    if (!email || !password) return { ok: false, message: 'Email and password required' };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) return { ok: false, message: 'Invalid credentials' };

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return { ok: false, message: `Account locked. Try again in ${mins} minutes` };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedAttempts + 1;
      const lockout = attempts >= MAX_FAILED_ATTEMPTS
        ? { lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60000), failedAttempts: 0 }
        : { failedAttempts: attempts };
      await prisma.user.update({ where: { id: user.id }, data: lockout });
      return { ok: false, message: 'Invalid credentials' };
    }

    if (user.failedAttempts > 0) {
      await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } });
    }

    const tokenPayload = { id: user.id, profileType: 'user', role: user.role, jwtVersion: user.jwtVersion };
    const accessToken = signToken(tokenPayload, ACCESS_EXPIRY);
    const refreshToken = signToken({ ...tokenPayload, type: 'refresh' }, REFRESH_EXPIRY);
    await cacheJwt(accessToken, { ...tokenPayload, jti: jwt.decode(accessToken).jti });

    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        portal: 'admin',
        ip: querier.ip || null,
        userAgent: querier.userAgent?.substring(0, 200),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const profile = profilePayload(user);
    return { ok: true, token: { token: accessToken, expiresIn: ACCESS_EXPIRY, refreshToken, refreshExpiresIn: REFRESH_EXPIRY }, profile };
  }

  static async refreshToken(querier, data) {
    const { refreshToken } = data;
    if (!refreshToken) return { ok: false, message: 'Refresh token required', code: 'BadRequest' };

    const session = await prisma.session.findFirst({ where: { refreshToken, isActive: true } });
    if (!session) return { ok: false, message: 'Invalid refresh token', code: 'Unauthorized' };

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.deletedAt || !user.isActive) return { ok: false, message: 'Account unavailable', code: 'Unauthorized' };

    const tokenPayload = { id: user.id, profileType: 'user', role: user.role, jwtVersion: user.jwtVersion };
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
    return { ok: true, profile: profilePayload(querier.profile) };
  }

  static async logout(querier) {
    if (querier.sessionId) {
      await prisma.session.update({ where: { id: querier.sessionId }, data: { isActive: false } });
    }
    return { ok: true };
  }
}
