import { prisma } from '../../lib/prisma.js';

// Fields exposed to the admin portal for a quick reply.
const QUICK_REPLY_SELECT = {
  id: true,
  title: true,
  body: true,
  createdAt: true,
  updatedAt: true,
};

export class QuickReplyService {
  // GET /api/v1/quick-replies — newest first
  static async list() {
    const rows = await prisma.quickReply.findMany({
      select: QUICK_REPLY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return { ok: true, data: rows };
  }

  // POST /api/v1/quick-replies — body: { title, body }
  static async create(querier, data) {
    const title = (data.title ?? '').toString().trim();
    const body = (data.body ?? '').toString().trim();

    if (!title) return { ok: false, message: 'title is required', code: 'BadRequest' };
    if (!body) return { ok: false, message: 'body is required', code: 'BadRequest' };

    const reply = await prisma.quickReply.create({
      data: { title, body },
      select: QUICK_REPLY_SELECT,
    });

    return { ok: true, detail: reply };
  }

  // DELETE /api/v1/quick-replies/:id
  static async delete(querier, id) {
    const existing = await prisma.quickReply.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, message: 'Quick reply not found', code: 'NotFound' };

    await prisma.quickReply.delete({ where: { id } });
    return { ok: true, detail: { id, deleted: true } };
  }
}
