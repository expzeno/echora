import { prisma } from '../../lib/prisma.js';

export class DashboardService {
  static async stats(querier) {
    const [userTotal, customerTotal, customerActive, merchantTotal, merchantActive] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.merchant.count({ where: { deletedAt: null } }),
      prisma.merchant.count({ where: { deletedAt: null, status: 'active' } }),
    ]);

    return {
      ok: true,
      detail: {
        users: { total: userTotal },
        customers: { total: customerTotal, active: customerActive },
        merchants: { total: merchantTotal, active: merchantActive },
        orders: { today: 0 },
        transactions: { today: 0 },
      },
    };
  }
}
