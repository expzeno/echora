import { AsyncLocalStorage } from 'node:async_hooks';
import { pushToMicroBuffer } from './logQueueProducer.js';

export const als = new AsyncLocalStorage();

const AUDITED = new Set([
  // Add your business models here. Use exact Prisma model names (PascalCase).
  // 'Customer', 'Merchant', 'Order', 'Transaction', 'Wallet',
]);

const MUTATIONS = new Set([
  'create', 'createMany', 'update', 'updateMany',
  'delete', 'deleteMany', 'upsert',
]);

export const txLogStore = new AsyncLocalStorage();

export const auditExtension = {
  name: 'audit-log',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const result = await query(args);
        if (!AUDITED.has(model) || !MUTATIONS.has(operation)) return result;
        if (process.env.MODEL_LOG_HOOKS_ENABLED === 'false') return result;

        const raw = {
          op: operation,
          model,
          args,
          result,
          profile: als.getStore() ?? { profileType: 'system', profileId: null },
          at: new Date().toISOString(),
        };

        const store = txLogStore.getStore();
        if (store) store.pendingLogs.push(raw);
        else pushToMicroBuffer(raw);

        return result;
      },
    },
  },
};

// IMPORTANT: Prisma Client Extensions do NOT propagate to the tx client inside
// $transaction(). Use this tx() wrapper — it collects audit logs via txLogStore
// and flushes them only on successful commit.
export async function tx(fn, options) {
  const { prisma } = await import('./prisma.js');
  return await txLogStore.run({ pendingLogs: [] }, async () => {
    const result = await prisma.$transaction(fn, options);
    const store = txLogStore.getStore();
    if (store?.pendingLogs?.length) store.pendingLogs.forEach(pushToMicroBuffer);
    return result;
  });
}
