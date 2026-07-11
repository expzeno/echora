import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { invalidateProfile } from '../../lib/jwtCache.js';
import { paginatedList } from '../../shared/utils/paginatedList.js';

export class CustomerService {
  static async basicList(querier, data) {
    const where = { deletedAt: null };
    if (data.status) where.status = data.status;
    return paginatedList('customer', {
      where,
      options: { limit: Number(data.limit) || 20, cursor: data.cursor ? Number(data.cursor) : undefined, offset: data.offset ? Number(data.offset) : undefined, search: data.search },
      searchFields: ['displayName', 'email'],
    });
  }

  static async detail(querier, id) {
    const item = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!item) return { ok: false, message: 'Customer not found', code: 'NotFound' };
    return { ok: true, detail: item };
  }

  static async create(querier, data) {
    const { email, displayName, phoneNumber, password } = data;
    if (!email || !displayName) return { ok: false, message: 'Email and display name required' };

    const exists = await prisma.customer.findUnique({ where: { email } });
    if (exists) return { ok: false, message: 'Email already exists', code: 'Conflict' };

    const passwordHash = await bcrypt.hash(password || 'changeme123', 10);
    const item = await prisma.customer.create({
      data: { email, displayName, phoneNumber, passwordHash },
    });
    return { ok: true, detail: item };
  }

  static async update(querier, id, data) {
    const item = await prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!item) return { ok: false, message: 'Customer not found', code: 'NotFound' };

    const { displayName, phoneNumber, status } = data;
    const updated = await prisma.customer.update({
      where: { id },
      data: { ...(displayName && { displayName }), ...(phoneNumber !== undefined && { phoneNumber }), ...(status && { status }) },
    });
    await invalidateProfile('customer', id);

    return { ok: true, detail: updated };
  }
}
