import { prisma } from '../../lib/prisma.js';

const NUMBER_SELECT = {
  id: true,
  phoneNumber: true,
  displayName: true,
  wabaId: true,
  phoneNumberId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export class WhatsappNumberService {
  // GET /api/v1/whatsapp-numbers — newest first
  static async list() {
    const rows = await prisma.whatsappNumber.findMany({
      select: NUMBER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return { ok: true, data: rows };
  }

  // GET /api/v1/whatsapp-numbers/:id
  static async getById(querier, id) {
    const number = await prisma.whatsappNumber.findUnique({ where: { id }, select: NUMBER_SELECT });
    if (!number) return { ok: false, message: 'WhatsApp number not found', code: 'NotFound' };
    return { ok: true, detail: number };
  }

  // POST /api/v1/whatsapp-numbers — body: { phoneNumber, displayName, wabaId?, phoneNumberId?, isActive? }
  // Accepts businessAccountId as an alias for wabaId.
  static async create(querier, data) {
    const phoneNumber = (data.phoneNumber ?? '').toString().trim();
    const displayName = (data.displayName ?? '').toString().trim();

    if (!phoneNumber) return { ok: false, message: 'phoneNumber is required', code: 'BadRequest' };
    if (!displayName) return { ok: false, message: 'displayName is required', code: 'BadRequest' };

    const existing = await prisma.whatsappNumber.findUnique({ where: { phoneNumber }, select: { id: true } });
    if (existing) return { ok: false, message: 'That phone number is already registered', code: 'Conflict' };

    const number = await prisma.whatsappNumber.create({
      data: {
        phoneNumber,
        displayName,
        wabaId: (data.wabaId ?? data.businessAccountId ?? null) || null,
        phoneNumberId: (data.phoneNumberId ?? null) || null,
        isActive: data.isActive === undefined ? true : !!data.isActive,
      },
      select: NUMBER_SELECT,
    });

    return { ok: true, detail: number };
  }

  // PATCH /api/v1/whatsapp-numbers/:id
  static async update(querier, id, data) {
    const existing = await prisma.whatsappNumber.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, message: 'WhatsApp number not found', code: 'NotFound' };

    const patch = {};
    if (data.phoneNumber !== undefined) {
      const pn = data.phoneNumber.toString().trim();
      if (!pn) return { ok: false, message: 'phoneNumber cannot be empty', code: 'BadRequest' };
      patch.phoneNumber = pn;
    }
    if (data.displayName !== undefined) {
      const dn = data.displayName.toString().trim();
      if (!dn) return { ok: false, message: 'displayName cannot be empty', code: 'BadRequest' };
      patch.displayName = dn;
    }
    if (data.wabaId !== undefined || data.businessAccountId !== undefined) {
      patch.wabaId = (data.wabaId ?? data.businessAccountId ?? null) || null;
    }
    if (data.phoneNumberId !== undefined) patch.phoneNumberId = data.phoneNumberId || null;
    if (data.isActive !== undefined) patch.isActive = !!data.isActive;

    const number = await prisma.whatsappNumber.update({ where: { id }, data: patch, select: NUMBER_SELECT });
    return { ok: true, detail: number };
  }

  // PATCH /api/v1/whatsapp-numbers/:id/toggle — flip isActive
  static async toggleActive(querier, id) {
    const current = await prisma.whatsappNumber.findUnique({ where: { id }, select: { isActive: true } });
    if (!current) return { ok: false, message: 'WhatsApp number not found', code: 'NotFound' };

    const number = await prisma.whatsappNumber.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: NUMBER_SELECT,
    });
    return { ok: true, detail: number };
  }

  // DELETE /api/v1/whatsapp-numbers/:id
  static async delete(querier, id) {
    const existing = await prisma.whatsappNumber.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, message: 'WhatsApp number not found', code: 'NotFound' };

    await prisma.whatsappNumber.delete({ where: { id } });
    return { ok: true, detail: { id, deleted: true } };
  }
}
