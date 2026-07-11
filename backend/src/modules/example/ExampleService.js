import { prisma } from '../../lib/prisma.js';

export class ExampleService {
  static async list(querier) {
    // const items = await prisma.example.findMany();
    return { ok: true, items: [] };
  }

  static async getById(querier, id) {
    // const item = await prisma.example.findUnique({ where: { id: Number(id) } });
    // if (!item) return { ok: false, code: 'NotFound', message: 'Not found' };
    return { ok: true, item: { id } };
  }

  static async create(querier, data) {
    // const item = await prisma.example.create({ data });
    return { ok: true, item: data };
  }
}
