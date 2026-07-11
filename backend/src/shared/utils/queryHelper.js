export const Q_listoptions = (req) => {
  const { limit, offset, order, cursor, search } = req.query;
  const options = {};
  if (limit) options.limit = Number(limit);
  if (offset) options.offset = Number(offset);
  if (cursor) options.cursor = Number(cursor);
  if (search) options.search = search;
  if (order) {
    const orderObj = JSON.parse(order);
    options.order = orderObj.order;
  }
  return options;
};

export const Q_where = (conditions, req) => {
  const query = req.query;
  const where = {};
  if (conditions) {
    for (const c of conditions) {
      const { type = '=', ignoreNull } = c;
      const field = c.field || c.name;
      if (query[field]) {
        let value = query[field];
        if ('null' === value) {
          if (ignoreNull) continue;
          else value = null;
        }
        if (type === '=') where[field] = value;
      }
    }
  }
  return where;
};
