# Production Scalability Deploy Guide

## Prisma Connection Pool

```env
PRISMA_POOL_SIZE=20          # connections per Prisma client (default: 5)
PRISMA_POOL_TIMEOUT=15       # seconds to wait for a connection (default: 10)
```

With PM2 cluster mode (N workers), total connections = `PRISMA_POOL_SIZE × num_clients × N`.
Ensure PostgreSQL `max_connections` covers this total (default 100 is likely insufficient).

## PM2 Cluster Mode

```bash
pm2 start ecosystem.config.cjs --env production
```

- API: cluster mode, `PM2_INSTANCES` workers (default: all CPU cores)
- Log worker: fork mode, 1 instance

Set `PM2_INSTANCES` env var to limit worker count (e.g., `PM2_INSTANCES=4`).

Cluster mode requires Redis-backed WebSocket pub/sub and rate-limit store.
Both auto-detect Redis and fall back to in-memory in dev.

## Redis Rate-Limit Store

No extra config — auto-connects to the same Redis instance.
Rate-limit counters stored under `rl:auth:*`, `rl:authId:*`, `rl:api:*` keys.
All PM2 workers share the same counters in production.

## Production `.env` Additions

```env
PRISMA_POOL_SIZE=20
PRISMA_POOL_TIMEOUT=15
PM2_INSTANCES=4
INLINE_WORKER=false
```

## DB Migration (Indexes)

After deploying code, run:
```bash
npx prisma migrate deploy --schema prisma/main/schema.prisma
```

Index migrations are non-destructive (CREATE INDEX only). Safe under live traffic.
