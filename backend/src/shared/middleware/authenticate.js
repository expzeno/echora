import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import { getCachedJwt, cacheJwt, getCachedProfile, cacheProfile } from '../../lib/jwtCache.js';
import { prisma } from '../../lib/prisma.js';
import { als } from '../../lib/audit.js';
import { Unauthorized, Forbidden } from '../utils/httpErrors.js';

let publicKey = process.env.JWT_PUBLIC_KEY || null;
if (!publicKey) {
  try { publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem'); }
  catch { /* JWT public key not loaded — auth will fail until keys are configured */ }
}

function extractToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Unauthorized('No token provided');
  return token;
}

async function verifyAndLoadClaims(token) {
  let claims = await getCachedJwt(token);
  if (!claims) {
    claims = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    await cacheJwt(token, claims);
  }
  return claims;
}

async function loadSession(token) {
  const session = await prisma.session.findFirst({ where: { token, isActive: true } });
  if (!session) throw new Unauthorized('Session expired');
  return session;
}

function handleAuthError(err, res, next) {
  if (err.name === 'TokenExpiredError') return res.status(401).json({ ok: false, message: 'Token expired' });
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ ok: false, message: 'Invalid token' });
  if (err instanceof Unauthorized) return res.status(401).json({ ok: false, message: err.message });
  next(err);
}

export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    const claims = await verifyAndLoadClaims(token);

    let profile = await getCachedProfile(claims.profileType, claims.id);
    if (!profile) {
      profile = await prisma.user.findUnique({ where: { id: claims.id } });
      if (!profile) throw new Unauthorized('Account not found');
      await cacheProfile(claims.profileType, claims.id, profile);
    }

    if (profile.deletedAt) throw new Unauthorized('Account deleted');
    if (!profile.isActive) throw new Unauthorized('Account deactivated');
    if (claims.jwtVersion !== undefined && claims.jwtVersion !== profile.jwtVersion) {
      throw new Unauthorized('Token revoked');
    }

    const session = await loadSession(token);

    req.querier = {
      profileType: claims.profileType,
      profileId: claims.id,
      sessionId: session.id,
      profile,
    };

    als.run({ profileType: claims.profileType, profileId: claims.id }, () => next());
  } catch (err) {
    handleAuthError(err, res, next);
  }
}

export async function authenticateCustomer(req, res, next) {
  try {
    const token = extractToken(req);
    const claims = await verifyAndLoadClaims(token);

    if (claims.profileType !== 'customer') throw new Unauthorized('Invalid token type');

    let profile = await getCachedProfile('customer', claims.id);
    if (!profile) {
      profile = await prisma.customer.findUnique({ where: { id: claims.id } });
      if (!profile) throw new Unauthorized('Account not found');
      await cacheProfile('customer', claims.id, profile);
    }

    if (profile.deletedAt) throw new Unauthorized('Account deleted');
    if (!profile.isActive) throw new Unauthorized('Account deactivated');
    if (claims.jwtVersion !== undefined && claims.jwtVersion !== profile.jwtVersion) {
      throw new Unauthorized('Token revoked');
    }

    const session = await loadSession(token);

    req.querier = {
      profileType: 'customer',
      profileId: claims.id,
      sessionId: session.id,
      profile,
    };

    als.run({ profileType: 'customer', profileId: claims.id }, () => next());
  } catch (err) {
    handleAuthError(err, res, next);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.querier?.profile?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ ok: false, message: 'Insufficient permissions' });
    }
    next();
  };
}
