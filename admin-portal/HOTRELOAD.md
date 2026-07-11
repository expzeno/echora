# Hot Reload Standard — Angular/Ionic Projects

Hot reload is **cache buster + frontend polling**, dev environment only. It is NOT `build:watch`.

---

## How it works (two parts)

**1. Cache buster** — `post-build.mjs` writes `build-version.json` (with `devMode`, `buildTime`, `hash`) into `www/` after every build. This is the signal that new code is ready.

**2. Frontend polling** — An inline script in `index.html` polls `/build-version.json` every 4 seconds. When `buildTime` changes, it calls `location.reload()`. Inert in production (`devMode: false`) — safe to ship.

**Standard workflow:** edit files → `npm run build` (one-shot) → browser auto-reloads via polling. No persistent watcher needed.

See CODING_STANDARD.md §27 for the full spec.

---

## One subdomain, always static files

Nginx **always** serves static files from `www/`. There is no dev server and no WebSocket proxy — one subdomain only: `{shortcode}.labzeno.com → www/`.

`ng serve` is not the standard. Use it only for quick isolated local testing outside Nginx — it is never proxied through a server subdomain.

---

## Build commands

| Mode | Command | When to use |
|---|---|---|
| Dev (one-shot) | `npm run build` | Standard workflow — build once, browser auto-reloads |
| Dev (watch) | `npm run build:watch` | Active coding sessions only — auto-rebuilds on save |
| Production | `npm run build:prod` | Sandbox / release |

---

## Package.json scripts

```json
"build":         "ng build --configuration development && node post-build.mjs",
"build:watch":   "node post-build.mjs --watch & ng build --watch --configuration development",
"build:sandbox": "ng build --configuration sandbox && node post-build.mjs --prod",
"build:prod":    "ng build --configuration production && node post-build.mjs --prod"
```

`build:watch` is a convenience for active coding sessions — it runs `ng build --watch` (auto-rebuild on save) + `post-build.mjs --watch` (auto-update `build-version.json`) in parallel. Kill it before wrapping up. NEVER leave running as daemon/PM2/nohup.

---

## Nginx configuration (dispatcher manages this)

One block per project:

```nginx
server {
    server_name {shortcode}.labzeno.com;

    root /home/server_tridentity_me/projects/{project}/www;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA fallback
    }
}
```

No WebSocket proxy, no `proxy_pass` — plain static file serving.

---

## Requesting a subdomain for a new project

Add to your comms file (`~/projects/.agent-comms/{project}.msg.md`):

```
## [{PROJECT} → DISPATCHER] — YYYY-MM-DD — ID: {project}-nginx-001
**Status:** PENDING
**Action:** New Angular project — need Nginx subdomain
**Detail:**
- {shortcode}.labzeno.com → static files at /home/server_tridentity_me/projects/{project}/www
```

---

## Quick reference

```bash
# Active development (auto-rebuild on save)
ng build --watch --configuration development

# One-shot dev build
ng build --configuration development && node post-build.mjs

# Production build
ng build --configuration production && node post-build.mjs --prod

# Check which subdomain serves your project
grep {shortcode} ~/projects/.agent-comms/dispatcher.msg.md
```
