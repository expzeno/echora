import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { invalidateProfile } from '../../lib/jwtCache.js';
import { paginatedList } from '../../shared/utils/paginatedList.js';

export class UserService {
  static async basicList(querier, data) {
    const where = { deletedAt: null };
    return paginatedList('user', {
      where,
      options: { limit: Number(data.limit) || 20, cursor: data.cursor ? Number(data.cursor) : undefined, offset: data.offset ? Number(data.offset) : undefined, search: data.search },
      searchFields: ['email'],
    });
  }

  static async create(querier, data) {
    const { email, password, role, displayName } = data;
    if (!email || !password) return { ok: false, message: 'Email and password required' };

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return { ok: false, message: 'Email already exists', code: 'Conflict' };

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, role: role || 'staff' },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return { ok: true, detail: user };
  }

  static async update(querier, id, data) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) return { ok: false, message: 'User not found', code: 'NotFound' };

    const { role, isActive } = data;
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    await invalidateProfile('user', id);

    return { ok: true, detail: updated };
  }
}
