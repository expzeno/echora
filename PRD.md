# Echora — PRD

## TL;DR
Echora is a **custom WhatsApp customer support portal** — a backoffice / agent dashboard for
managing customer conversations that arrive over WhatsApp. Phase 1 delivers the backend skeleton:
an Express.js API (with Prisma ORM) with Postgres, Redis-backed queues, a WhatsApp webhook endpoint, and auth. The
frontend (Ionic + Angular + Capacitor) is the agent-facing console, built after the backend
skeleton is standing.

## Agent Quick-Find
- **Backend:** `echora` repo — Express.js + Prisma ORM. Entry work in `backend/`.
- **Frontend:** `echora-app` repo — Ionic + Angular + Capacitor agent console.
- **DB:** PostgreSQL, database `echora_db`.
- **Queue:** Redis + BullMQ.
- **Realtime:** Socket.IO (live conversation / agent presence updates).
- **Env prefix:** `ECHORA_` (e.g. `ECHORA_DB_URL`, `ECHORA_WA_TOKEN`).
- **Brand:** direction in `docs/brand-research.md` (from Design Expert). Full `BRAND_GUIDE.md` pending.

## Product
- **What:** A dedicated support portal so agents handle WhatsApp customer conversations from one
  operational dashboard instead of a phone.
- **Who:** Support agents (primary), team leads / supervisors (oversight), admins (config).
- **Why:** WhatsApp is where customers are; a purpose-built backoffice gives routing, history,
  queueing, SLAs, and reporting that the native WhatsApp app cannot.

## Tech Stack
| Layer | Choice |
|---|---|
| Backend framework | **Express.js** (Node.js) + **Prisma ORM** |
| Database | **PostgreSQL** (`echora_db`) |
| Cache / queue store | **Redis** |
| Job queue | **BullMQ** |
| Realtime | **Socket.IO** |
| Frontend | **Ionic + Angular + Capacitor** |
| Env config prefix | `ECHORA_` |
| Environment | **development only** (this server is DEV) |

## Phase 1 Focus — Backend Skeleton
1. **Express project** — scaffold, module structure, config module reading `ECHORA_*` env vars.
2. **Postgres schema** — core entities: agents/users, customers, conversations, messages, queues.
3. **Auth** — agent login (JWT), roles (agent / lead / admin).
4. **WhatsApp webhook endpoint** — receive inbound WhatsApp messages, verify signature, enqueue.
5. **Queue setup** — BullMQ workers for inbound message processing + outbound send.
6. **Realtime channel** — Socket.IO gateway for live conversation updates (stub in Phase 1).

## Repos
- `echora` — backend (this repo).
- `echora-app` — frontend agent console (Ionic + Angular + Capacitor).

## Current State (2026-07-11)
- Project bootstrapped: git repo, `CONVERSATIONS.json`, `docs/INDEX.md`, this PRD, `CLAUDE.md`.
- Brand **research** landed (`docs/brand-research.md`); full `BRAND_GUIDE.md` still pending from Design Expert.
- **Not yet scaffolded.** Stack confirmed: Express.js + Prisma backend (aligns with the standard
  `zentemplate` scaffold) + Ionic + Angular frontend. Backend scaffold to be produced on the
  Express stack before Phase 1 build.
- Infra (port / Nginx / PM2) not yet provisioned — deferred until backend entrypoint exists.

## Pending / Next
- [ ] Design Expert to produce `BRAND_GUIDE.md` from `docs/brand-research.md`.
- [ ] Confirm Express scaffold path (template vs. hand-scaffold) and stand up `backend/`.
- [ ] Provision infra (backend port, `apiec.labzeno.com`, PM2) once entrypoint exists.
- [ ] Build Phase 1 backend skeleton (items 1–6 above).
