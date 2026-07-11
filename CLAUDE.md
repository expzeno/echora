# Echora — Project Agent

Echora is a custom **WhatsApp customer support portal** — a backoffice / agent dashboard.
Backend: NestJS + PostgreSQL + Redis + BullMQ + Socket.IO. Frontend: Ionic + Angular + Capacitor.

## Read Triggers
- `BRAND_GUIDE.md` — read before any UI/design/frontend work (pending — Design Expert to produce).
- `docs/INDEX.md` — scan triggers at session start; read relevant docs for the current task.
- `PRD.md` — read TL;DR + Agent Quick-Find + Current State before starting work.
- `docs/brand-research.md` — brand direction (palette, type, personality) until BRAND_GUIDE lands.

## Conventions
- **Environment is DEV only.** `NODE_ENV=development`. No production/staging builds.
- **Env prefix:** `ECHORA_` for all environment variables.
- **DB name:** `echora_db`.
- **Repos:** `echora` (backend), `echora-app` (frontend).
- Ports / Nginx / PM2 go through the **dispatcher** — never assign yourself.
- Follow `~/projects/zentemplate/CODING_STANDARD.md` (backend) and
  `FRONTEND_CODING_STANDARD.md` (frontend); read once per session when touching that layer.

## Phase 1
Backend skeleton: NestJS project, Postgres schema, auth (JWT + roles), WhatsApp webhook endpoint,
BullMQ queue setup, Socket.IO gateway stub. See `PRD.md` → Phase 1 Focus.
