# Admin UX + Maintenance Guide

## Advanced Admin UX Features
- Sidebar with active state navigation across all resources.
- Global search form wired to the existing filter/sort API.
- Advanced filters panel: always visible, supports rule builder.
- Filter operators supported: `=`, `≠`, `contains`, `>`, `≥`, `<`, `≤`, `between`.
- Between operator is translated server-side to `gte` + `lte`.
- Quick create form for fast inline resource creation.
- Column toggle chip set with view-state control.
- Inline row edit/save/cancel via form actions.
- Row detail drawer for rich record viewing.
- Toast feedback for success/error states.
- Theme toggle with persisted light/dark mode.
- CSV export of filtered data via `GET /:resource.csv`.
- Stats cards with preset counts by status and quick filter chips.

## Behavior & Response Format
- Responses are served by `apps/admin/src/server.ts` and match the admin SSR shell.
- Client interactivity lives in `apps/admin/src/admin.js`.
- Sorting uses the existing list API query params.
- Pagination is preserved across filter changes.
- Deleting/inline actions use the API endpoints already defined in `apps/api`.

## Visual Design System
- Unified Neumorphism look across the admin panel.
- Same-tone base surfaces with extruded soft shadows.
- Recessed inputs via inset shadows.
- Muted semantic accents for status and actions.
- Light and dark token sets with smooth transitions.

## Services & Ports

| Service      | Port | URL                         | Package              |
|-------------|------|-----------------------------|----------------------|
| Storefront  | 3000 | http://localhost:3000        | `@lakshya/webstore`  |
| API         | 3001 | http://localhost:3001/health | `@lakshya/api`       |
| Admin       | 3100 | http://localhost:3100/       | `@lakshya/admin`     |
| Publisher   | 3101 | http://localhost:3101/       | `@lakshya/admin-publisher` |

Admin and Publisher are separate Fastify instances sharing the same renderer
(`buildApp()` from `@lakshya/admin`). Different auth tokens → different role
scopes → different nav trees. Zero per-surface UI code.

## Relevant Files
- `apps/admin/src/server.ts`: advanced admin renderer (exports `buildApp()`).
- `apps/admin/src/admin.js`: admin UI behavior.
- `apps/admin/src/__tests__/admin.render.test.ts`: render suite.
- `apps/admin-publisher/src/server.ts`: publisher surface (imports `buildApp()`).
- `apps/webstore/app/globals.css`: global design surface.
- `apps/api/src/crud.ts`: API filtering operators.
- `start.sh`: lifecycle entry point (delegates to `scripts/runtime/start`).
- `scripts/runtime/start`: service lifecycle (start/stop/restart/status).
- `docs/RUNTIME.md`: full port map, lifecycle docs, troubleshooting.

## Quick Commands

```bash
# Lifecycle
bash ./start.sh              # start all services
bash ./start.sh stop         # stop all
bash ./start.sh restart      # restart all
bash ./start.sh status       # show ports
bash ./start.sh stop admin   # stop one service
bash ./start.sh restart api  # restart one service

# Tests
pnpm --filter @lakshya/admin test
pnpm --filter @lakshya/admin build
pnpm --filter @lakshya/webstore build

# Full suite
pnpm run test
pnpm run typecheck
pnpm run build
```
