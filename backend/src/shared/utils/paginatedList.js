import { prisma } from '../../lib/prisma.js';

const CURSOR_THRESHOLD = 50000;

/**
 * Smart paginated list — auto-routes to cursor or offset based on table size.
 *
 * Usage:
 *   const result = await paginatedList('merchant', { where, options });
 *   const result = await paginatedList('customer', { where, options, searchFields: ['name','email'] });
 *
 * @param {string} model - Prisma model name (e.g. 'merchant', 'order', 'customer')
 * @param {object} params
 * @param {object} params.where - Prisma where clause
 * @param {object} params.options - { limit, offset, cursor, search, order }
 * @param {string[]} [params.searchFields] - fields to search (contains, insensitive)
 */
export async function paginatedList(model, { where = {}, options = {}, searchFields = [] }) {
  const delegate = prisma[model];
  if (!delegate) throw new Error(`Unknown Prisma model: ${model}`);

  if (options.search && searchFields.length > 0) {
    const searchFilter = { contains: options.search, mode: 'insensitive' };
    where = {
      ...where,
      OR: searchFields.map((f) => ({ [f]: searchFilter })),
    };
  }

  const orderBy = options.order || { id: 'asc' };
  const take = options.limit || 20;

  // Always get count (needed for frontend paginator)
  const totalCount = await delegate.count({ where });

  // Empty result shortcut
  if (totalCount === 0) {
    return { ok: true, list: [], totalCount: 0, nextCursor: null, strategy: 'empty' };
  }

  let query;
  let strategy;

  if (options.cursor) {
    // Cursor provided — always use it (fastest path)
    query = { where, take, orderBy, cursor: { id: options.cursor }, skip: 1 };
    strategy = 'cursor';
  } else if (options.offset && options.offset > 0) {
    if (totalCount > CURSOR_THRESHOLD) {
      // Large table — deferred join (index-only scan for boundary, then seek)
      const boundary = await delegate.findMany({
        where,
        select: { id: true },
        orderBy,
        skip: options.offset,
        take: 1,
      });
      if (boundary.length === 0) {
        return { ok: true, list: [], totalCount, nextCursor: null, strategy: 'deferred-empty' };
      }
      query = { where: { ...where, id: { gte: boundary[0].id } }, take, orderBy };
      strategy = 'deferred';
    } else {
      // Small table — plain offset is fine
      query = { where, take, orderBy, skip: options.offset };
      strategy = 'offset';
    }
  } else {
    // Page 1 — no cursor or offset needed
    query = { where, take, orderBy };
    strategy = 'first-page';
  }

  const list = await delegate.findMany(query);
  const nextCursor = list.length > 0 ? list[list.length - 1].id : null;

  return { ok: true, list, totalCount, nextCursor, strategy };
}
