# Labzeno Backend Template

Canonical Node.js backend template for all Labzeno projects.

## Stack
- **Runtime:** Node.js (ESM)
- **Framework:** Express 4
- **ORM:** Prisma 6 (pinned ^6)
- **Database:** PostgreSQL
- **Cache/Queue:** Redis + BullMQ
- **Logger:** pino (structured, CyberZeno-compatible)
- **Validation:** zod
- **Monitoring:** CyberZeno Node SDK

## Architecture

```
src/
├── server.js                    # Entry — boot, middleware, shutdown
├── lib/
│   ├── prisma.js                # Prisma singleton (main DB + logs DB)
│   ├── redis.js                 # Redis singleton
│   ├── logger.js                # pino structured logger
│   ├── audit.js                 # AsyncLocalStorage + Prisma audit extension
│   └── logQueueProducer.js      # microBuffer → BullMQ queue
├── modules/
│   └── {domain}/                # Domain-first grouping
│       ├── {domain}.routes.js   # Router aggregator
│       ├── {feature}_api.js     # Route definitions (one-liner with handle())
│       └── {Feature}Service.js  # Business logic (static class)
├── shared/
│   ├── middleware/              # cors, rateLimiters, validate, upload, timeout
│   ├── utils/                  # handle(), httpErrors
│   └── helpers/                # accessLogHelper, auditContext
├── workers/
│   ├── logWorker.js            # Separate process — consumes BullMQ, writes to logs DB
│   ├── auditFields.js          # Per-model field whitelist (no PII)
│   └── buildModelLogRow.js     # Whitelist transform
└── prisma/
    ├── main/schema.prisma      # Business models
    └── logs/schema.prisma      # ModelLog, ApiAccessLog, WebhookLog
```

## Conventions

### Request/Response Envelope
- **Request:** `{ querier, data }` — middleware populates `querier`, client sends payload in `data`
- **Success:** `{ ok: true, ...fields }`
- **Error:** `{ ok: false, message }` with typed error codes

### Route Pattern
```js
router.post('/:id/action', validate(schema), handle(Service.method, { paramOrder: ['id'] }));
```

### No PII in Logs
- Per-model `AUDIT_FIELDS` whitelist in `workers/auditFields.js`
- IP hashed with daily-rotating salt (16-char hex)
- Default: fact-of-change only (no field data)

### Separate Logs Database
- Main DB: `{project}` — business data
- Logs DB: `{project}_logs` — ModelLog, ApiAccessLog, WebhookLog
- Log worker runs as child process, never blocks API

## Scaffold
```bash
./scaffold.sh <project-name> <shortcode> <primary-backend-port>
```

## Health Endpoints
- `GET /health` — `{ status, bootTime }` (process identity)
- `GET /health/live` — always 200 (liveness probe)
- `GET /health/ready` — DB ping (readiness probe)
