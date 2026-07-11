import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { invalidateProfile } from '../../lib/jwtCache.js';

export class CustProfileService {
  static async update(querier, data) {
    const { displayName, phoneNumber } = data;
    const updated = await prisma.customer.update({
      where: { id: querier.profileId },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(phoneNumber !== undefined && { phoneNumber }),
      },
      select: { id: true, email: true, displayName: true, phoneNumber: true },
    });
    await invalidateProfile('customer', querier.profileId);
    return { ok: true, profile: updated };
  }

  static async changePassword(querier, data) {
    const { currentPassword, newPassword } = data;
    const customer = await prisma.customer.findUnique({ where: { id: querier.profileId } });
    if (!customer) return { ok: false, message: 'Account not found', code: 'NotFound' };

    const valid = await bcrypt.compare(currentPassword, customer.passwordHash);
    if (!valid) return { ok: false, message: 'Current password is incorrect' };

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // Increment jwtVersion to invalidate all existing tokens after password change
    await prisma.customer.update({
      where: { id: querier.profileId },
      data: { passwordHash, jwtVersion: { increment: 1 } },
    });
    await invalidateProfile('customer', querier.profileId);
    return { ok: true, message: 'Password changed. Please log in again.' };
  }

  static async deleteAccount(querier) {
    await prisma.customer.update({
      where: { id: querier.profileId },
      data: { deletedAt: new Date(), isActive: false, jwtVersion: { increment: 1 } },
    });
    // Deactivate all sessions
    await prisma.session.updateMany({
      where: { customerId: querier.profileId, isActive: true },
      data: { isActive: false },
    });
    await invalidateProfile('customer', querier.profileId);
    return { ok: true, message: 'Account deleted.' };
  }
}
