import { prisma } from '../../lib/prisma.js';

const VALID_STATUS = ['open', 'pending', 'resolved', 'closed'];

// Shape a Conversation record (with contact + latest message included) into the
// payload the admin portal expects.
function shapeConversation(c) {
  const last = c.messages?.[0];
  return {
    id: c.id,
    status: c.status,
    contact: c.contact
      ? {
          name: c.contact.displayName || c.contact.profileName || null,
          phone_number: c.contact.phoneNumber || c.contact.waId || null,
        }
      : null,
    lastMessage: last ? { content: last.body, createdAt: last.createdAt } : null,
    unreadCount: 0,
    lastMessageAt: c.lastMessageAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function shapeMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    direction: m.direction,
    type: m.type,
    content: m.body,
    status: m.status,
    createdAt: m.createdAt,
    agentId: m.senderAgentId || null,
  };
}

export class ConversationService {
  // GET /api/v1/conversations?page=1&limit=20&status=open|pending|resolved|all
  static async list(querier, data) {
    const page = Math.max(1, Number(data.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(data.limit) || 20));
    const skip = (page - 1) * limit;

    const where = {};
    if (data.status && data.status !== 'all' && VALID_STATUS.includes(data.status)) {
      where.status = data.status;
    }

    const [total, rows] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        include: {
          contact: true,
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return { ok: true, data: rows.map(shapeConversation), total, page, limit };
  }

  // GET /api/v1/conversations/:id
  static async detail(querier, id) {
    const c = await prisma.conversation.findUnique({
      where: { id },
      include: { contact: true, whatsappNumber: true },
    });
    if (!c) return { ok: false, message: 'Conversation not found', code: 'NotFound' };

    return {
      ok: true,
      detail: {
        id: c.id,
        status: c.status,
        assignedAgentId: c.assignedAgentId,
        contact: c.contact
          ? {
              id: c.contact.id,
              name: c.contact.displayName || c.contact.profileName || null,
              phone_number: c.contact.phoneNumber || c.contact.waId || null,
              waId: c.contact.waId,
            }
          : null,
        whatsappNumber: c.whatsappNumber
          ? {
              id: c.whatsappNumber.id,
              phone_number: c.whatsappNumber.phoneNumber,
              display_name: c.whatsappNumber.displayName,
            }
          : null,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
    };
  }

  // GET /api/v1/conversations/:id/messages?page=1&limit=50 (oldest first)
  static async messages(querier, id, data) {
    const page = Math.max(1, Number(data.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(data.limit) || 50));
    const skip = (page - 1) * limit;

    const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!conv) return { ok: false, message: 'Conversation not found', code: 'NotFound' };

    const [total, rows] = await Promise.all([
      prisma.message.count({ where: { conversationId: id } }),
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return { ok: true, data: rows.map(shapeMessage), total, page, limit };
  }

  // POST /api/v1/conversations/:id/messages — outbound message from the portal
  static async sendMessage(querier, id, data) {
    const content = (data.content ?? data.body ?? '').toString().trim();
    if (!content) return { ok: false, message: 'Message content is required', code: 'BadRequest' };

    const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!conv) return { ok: false, message: 'Conversation not found', code: 'NotFound' };

    // Admin portal auth resolves to a User, not an Agent. Only attach senderAgentId
    // when the querier is actually an agent profile.
    const agentId = querier?.profileType === 'agent' ? querier.profileId : null;

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderAgentId: agentId,
        direction: 'outbound',
        type: 'text',
        body: content,
        status: 'sent',
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: message.createdAt },
    });

    return { ok: true, detail: shapeMessage(message) };
  }

  // PATCH /api/v1/conversations/:id/status
  static async updateStatus(querier, id, data) {
    if (!data.status || !VALID_STATUS.includes(data.status)) {
      return { ok: false, message: `status must be one of: ${VALID_STATUS.join(', ')}`, code: 'BadRequest' };
    }

    const conv = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
    if (!conv) return { ok: false, message: 'Conversation not found', code: 'NotFound' };

    const updated = await prisma.conversation.update({
      where: { id },
      data: { status: data.status },
    });

    return { ok: true, detail: { id: updated.id, status: updated.status, updatedAt: updated.updatedAt } };
  }
}
