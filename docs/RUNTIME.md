# Services & Runtime

## Port Map

| Service      | Port  | URL                          | Process                  |
|-------------|-------|------------------------------|--------------------------|
| Storefront  | 3000  | http://localhost:3000         | `next start` (Next.js)   |
| API         | 3001  | http://localhost:3001/health  | `tsx src/server.ts` (Fastify) |
| Admin       | 3100  | http://localhost:3100/        | `tsx src/server.ts` (Fastify SSR) |
| Publisher   | 3101  | http://localhost:3101/        | `tsx src/server.ts` (Fastify SSR) |

All services bind `0.0.0.0` (API, Admin, Publisher) or `*` (Next.js Storefront).

Ports are controlled by env vars with sensible defaults:
- `PORT` (default 3001) — API
- `ADMIN_PORT` (default 3100) — Admin panel
- `PUB_PORT` (default 3101) — Publisher panel
- `WEB_PORT` (default 3000) — Storefront

## Service Architecture

```
Storefront (Next.js :3000) → API (Fastify :3001) → Postgres
Admin (:3100)              → in-process inject → same Fastify app
Publisher (:3101)          → in-process inject → same Fastify app
```

- **API** is the core CRUD engine. All resources are metadata-driven; zero
  per-resource admin code.
- **Admin** and **Publisher** both reuse `@lakshya/admin`'s `buildApp()`
  renderer but authenticate as different roles (network vs publisher).
- **Storefront** is a Next.js app that calls the API via HTTP (`API_BASE`).

## Lifecycle Commands

```bash
# Start everything (stops existing first, waits for port release)
bash ./start.sh

# Stop everything
bash ./start.sh stop

# Restart everything
bash ./start.sh restart

# Status (shows canonical ports + ss output)
bash ./start.sh status

# Start/stop/restart individual services
bash ./start.sh api
bash ./start.sh admin
bash ./start.sh publisher
bash ./start.sh web
bash ./start.sh stop admin
bash ./start.sh restart api
```

The wrapper script `start.sh` delegates to `scripts/runtime/start`.

## Logs

Service logs are written to `logs/<service>.log`:
- `logs/api.log`
- `logs/admin.log`
- `logs/publisher.log`
- `logs/web.log`

Logs are truncated on each restart.

## How It Works

`scripts/runtime/start` handles all lifecycle:

1. **stop** — Finds PIDs listening on each canonical port via `ss -ltnp`, sends
   SIGTERM then SIGKILL. Confirms port release.
2. **start** — Checks port availability, starts the service with `setsid` in
   the correct working directory with the right env vars. Logs to `logs/`.
3. **restart** — stop + start with a 2-second delay between.
4. **all** (default) — stop all → wait for port release → start api → admin →
   publisher → web sequentially (2s between each for DB readiness).

`start.sh` is a thin wrapper that sources `scripts/runtime/start` inside a
login bash shell to ensure correct env resolution.

## Troubleshooting

**Port still occupied after stop:**
The stop command sends SIGKILL if SIGTERM doesn't release within 1 second. If
a port is still busy, use `ss -ltnp | grep :PORT` to find the lingering PID
and investigate manually.

**Admin/Publisher showing same content:**
Admin and Publisher are separate Fastify instances with different auth tokens
(network role vs publisher role). They share the same renderer code
(`buildApp()` from `@lakshya/admin`) but serve different nav trees based on
the authenticated role's permissions.

**Webstore can't reach API:**
The webstore connects to `API_BASE` (default `http://localhost:3001`). Ensure
the API is running first; the startup sequence waits 2s between services for
readiness.
