import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

// Fields the admin portal is allowed to see for an agent. passwordHash and the
// lockout counters are never exposed.
const AGENT_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
  isActive: true,
  systemPrompt: true,
  model: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

const VALID_ROLES = ['agent', 'lead', 'admin'];
const VALID_STATUS = ['active', 'suspended'];

export class AgentService {
  // GET /api/v1/agents — newest first
  static async list() {
    const rows = await prisma.agent.findMany({
      select: AGENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return { ok: true, data: rows };
  }

  // GET /api/v1/agents/:id
  static async getById(querier, id) {
    const agent = await prisma.agent.findUnique({ where: { id }, select: AGENT_SELECT });
    if (!agent) return { ok: false, message: 'Agent not found', code: 'NotFound' };
    return { ok: true, detail: agent };
  }

  // POST /api/v1/agents — body: { email, name|displayName, role?, status?, password? }
  static async create(querier, data) {
    const email = (data.email ?? '').toString().trim().toLowerCase();
    const displayName = (data.displayName ?? data.name ?? '').toString().trim();

    if (!email) return { ok: false, message: 'email is required', code: 'BadRequest' };
    if (!displayName) return { ok: false, message: 'name / displayName is required', code: 'BadRequest' };

    const role = VALID_ROLES.includes(data.role) ? data.role : 'agent';
    const status = VALID_STATUS.includes(data.status) ? data.status : 'active';

    // Optional AI configuration. systemPrompt is free-form; model falls back to the
    // schema default when omitted.
    const systemPrompt = data.systemPrompt === undefined ? undefined : (data.systemPrompt ?? '').toString().trim() || null;
    const model = data.model === undefined ? undefined : (data.model ?? '').toString().trim() || null;

    // passwordHash is required by the schema. Use the provided password, or seed a
    // random one the agent can reset later — an agent is never created without a hash.
    const rawPassword = (data.password ?? '').toString() || crypto.randomUUID();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const existing = await prisma.agent.findUnique({ where: { email }, select: { id: true } });
    if (existing) return { ok: false, message: 'An agent with that email already exists', code: 'Conflict' };

    const agent = await prisma.agent.create({
      data: {
        email,
        displayName,
        role,
        status,
        passwordHash,
        isActive: data.isActive === undefined ? true : !!data.isActive,
        ...(systemPrompt !== undefined ? { systemPrompt } : {}),
        ...(model !== undefined ? { model } : {}),
      },
      select: AGENT_SELECT,
    });

    return { ok: true, detail: agent };
  }

  // PATCH /api/v1/agents/:id — updatable: displayName|name, role, status, isActive, systemPrompt, model
  static async update(querier, id, data) {
    const existing = await prisma.agent.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, message: 'Agent not found', code: 'NotFound' };

    const patch = {};
    if (data.displayName !== undefined || data.name !== undefined) {
      const dn = (data.displayName ?? data.name ?? '').toString().trim();
      if (!dn) return { ok: false, message: 'displayName cannot be empty', code: 'BadRequest' };
      patch.displayName = dn;
    }
    if (data.role !== undefined) {
      if (!VALID_ROLES.includes(data.role)) {
        return { ok: false, message: `role must be one of: ${VALID_ROLES.join(', ')}`, code: 'BadRequest' };
      }
      patch.role = data.role;
    }
    if (data.status !== undefined) {
      if (!VALID_STATUS.includes(data.status)) {
        return { ok: false, message: `status must be one of: ${VALID_STATUS.join(', ')}`, code: 'BadRequest' };
      }
      patch.status = data.status;
    }
    if (data.isActive !== undefined) patch.isActive = !!data.isActive;
    if (data.systemPrompt !== undefined) {
      patch.systemPrompt = (data.systemPrompt ?? '').toString().trim() || null;
    }
    if (data.model !== undefined) {
      patch.model = (data.model ?? '').toString().trim() || null;
    }

    if (data.password) patch.passwordHash = await bcrypt.hash(data.password.toString(), 10);

    const agent = await prisma.agent.update({ where: { id }, data: patch, select: AGENT_SELECT });
    return { ok: true, detail: agent };
  }

  // PATCH /api/v1/agents/:id/toggle — flip isActive
  static async toggleActive(querier, id) {
    const current = await prisma.agent.findUnique({ where: { id }, select: { isActive: true } });
    if (!current) return { ok: false, message: 'Agent not found', code: 'NotFound' };

    const agent = await prisma.agent.update({
      where: { id },
      data: { isActive: !current.isActive },
      select: AGENT_SELECT,
    });
    return { ok: true, detail: agent };
  }

  // DELETE /api/v1/agents/:id
  static async delete(querier, id) {
    const existing = await prisma.agent.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, message: 'Agent not found', code: 'NotFound' };

    await prisma.agent.delete({ where: { id } });
    return { ok: true, detail: { id, deleted: true } };
  }
}
