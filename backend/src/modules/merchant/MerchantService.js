import { prisma } from '../../lib/prisma.js';
import { paginatedList } from '../../shared/utils/paginatedList.js';

export class MerchantService {
  static async basicList(querier, data) {
    const where = { deletedAt: null };
    if (data.status) where.status = data.status;
    return paginatedList('merchant', {
      where,
      options: { limit: Number(data.limit) || 20, cursor: data.cursor ? Number(data.cursor) : undefined, offset: data.offset ? Number(data.offset) : undefined, search: data.search },
      searchFields: ['displayName', 'email'],
    });
  }

  static async detail(querier, id) {
    const item = await prisma.merchant.findFirst({ where: { id, deletedAt: null } });
    if (!item) return { ok: false, message: 'Merchant not found', code: 'NotFound' };
    return { ok: true, detail: item };
  }

  static async create(querier, data) {
    const { email, displayName, description, phoneNumber, address } = data;
    if (!email || !displayName) return { ok: false, message: 'Email and display name required' };

    const exists = await prisma.merchant.findUnique({ where: { email } });
    if (exists) return { ok: false, message: 'Email already exists', code: 'Conflict' };

    const item = await prisma.merchant.create({
      data: { email, displayName, description, phoneNumber, address },
    });
    return { ok: true, detail: item };
  }

  static async update(querier, id, data) {
    const item = await prisma.merchant.findFirst({ where: { id, deletedAt: null } });
    if (!item) return { ok: false, message: 'Merchant not found', code: 'NotFound' };

    const { displayName, description, phoneNumber, address, status } = data;
    const updated = await prisma.merchant.update({
      where: { id },
      data: {
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(address !== undefined && { address }),
        ...(status && { status }),
      },
    });
    return { ok: true, detail: updated };
  }
}
