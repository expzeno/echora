// Prisma has no native SELECT ... FOR UPDATE support.
// These helpers provide pessimistic row-level locking in transactions.

const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function assertIdentifier(name, label) {
  if (!SAFE_IDENTIFIER.test(name)) throw new Error(`Invalid ${label}: ${name}`);
}

// Single row lock — use for wallets, accounts, single-entity mutations.
//   const wallet = await selectForUpdate(tx, 'wallets', { id: walletId });
export async function selectForUpdate(tx, table, where) {
  assertIdentifier(table, 'table');
  const entries = Object.entries(where);
  for (const [k] of entries) assertIdentifier(k, 'column');

  const conditions = entries
    .map(([k], i) => `"${k}" = $${i + 1}`)
    .join(' AND ');
  const values = Object.values(where);

  const rows = await tx.$queryRawUnsafe(
    `SELECT * FROM "${table}" WHERE ${conditions} FOR UPDATE`,
    ...values,
  );
  return rows[0] ?? null;
}

// Bulk row lock — use for stock deduction, multi-item operations.
// Locks all matching rows in one query (atomic, no deadlock risk from ordering).
//   const items = await selectManyForUpdate(tx, 'menu_items', 'id', [1, 2, 3]);
export async function selectManyForUpdate(tx, table, idColumn, ids) {
  if (!ids?.length) return [];
  assertIdentifier(table, 'table');
  assertIdentifier(idColumn, 'column');

  const rows = await tx.$queryRawUnsafe(
    `SELECT * FROM "${table}" WHERE "${idColumn}" = ANY($1::int[]) ORDER BY "${idColumn}" FOR UPDATE`,
    ids,
  );
  return rows;
}
