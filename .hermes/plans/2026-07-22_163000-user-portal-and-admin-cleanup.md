# User Portal + Admin Cleanup Plan

> **Goal:** Remove the erroneous publisher panel, consolidate admin access, and build a proper user portal within the webstore for customers to view purchases, manage their account, and submit support tickets.

**Architecture:** The admin panel (`:3100`) stays as the sole internal back-office. The publisher panel (`:3101`) is removed entirely. A new `/dashboard` section is added to the existing Next.js webstore (`:3000`) under authenticated routes. Customer authentication is handled via JWT through the API (`:3001`). Ticket support is a new resource managed via the admin panel.

**Tech Stack:** Next.js (App Router), Fastify (API), PostgreSQL via `@lakshya/core`, JWT auth, cookie-based sessions.

---

## Current Context

- **Admin panel** (`apps/admin/`, port 3100): Metadata-driven CRUD for all 39+ resources. Superadmin (`role: network`) access. This is correct and stays.
- **Publisher panel** (`apps/admin-publisher/`, port 3101): **REMOVED.** Same admin codebase, different JWT role (`publisher`). Useless artifact.
- **Webstore** (`apps/webstore/`, port 3000): Next.js App Router with auth pages and user dashboard now live.
- **API** (`apps/api/`, port 3001): Fastify. Has JWT auth, auth routes (register/login/logout/me), CORS enabled.
- **No user portal existed.** Now exists at `/dashboard`.

## Completed: Phase 1 — Remove Publisher Panel

- ✅ Deleted `apps/admin-publisher/` directory
- ✅ Removed `PUB_PORT` from runtime scripts
- ✅ Removed publisher start/stop from `scripts/runtime/start`
- ✅ Killed running publisher process on :3101
- ✅ Build passes (`pnpm run build`)

## Completed: Phase 2 — User Portal in Webstore

**Auth backend (API):**
- ✅ `POST /auth/register` — creates user + JWT cookie
- ✅ `POST /auth/login` — authenticates + JWT cookie
- ✅ `POST /auth/logout` — clears cookie
- ✅ `GET /auth/me` — returns current user from cookie
- ✅ Deps: `bcryptjs`, `@fastify/cookie@9` (Fastify 4 compatible)
- ✅ CORS: `Access-Control-Allow-Origin: http://localhost:3000`, `credentials: true`

**Frontend (apps/webstore):**
- ✅ Auth helpers: `lib/auth.ts` (login/register/logout/getUser, unwraps API envelope)
- ✅ `/login` page — email + password form
- ✅ `/register` page — name + email + password form
- ✅ `AuthHeader` component — shows Login link when logged out, username + Logout when logged in
- ✅ `LogoutButton` client component
- ✅ Auth form CSS (globals.css)
- ✅ Auth guard — dashboard redirects to /login if no token
- ✅ Dashboard layout — 2-column sidebar + content area
- ✅ `/dashboard` — overview with cards linking to purchases/support/profile
- ✅ `/dashboard/purchases` — order history table (API-backed)
- ✅ `/dashboard/support` — create tickets + list (localStorage until ticket API)
- ✅ `/dashboard/profile` — user details display
- ✅ Dashboard CSS (globals.css)
- ✅ Live services: API `:3001`, webstore `:3000`
- ✅ Build passes (`pnpm run build`)

**Files created:**
- `apps/webstore/lib/auth.ts`
- `apps/webstore/components/AuthHeader.tsx`
- `apps/webstore/components/LogoutButton.tsx`
- `apps/webstore/app/login/page.tsx`
- `apps/webstore/app/register/page.tsx`
- `apps/webstore/app/dashboard/layout.tsx`
- `apps/webstore/app/dashboard/page.tsx`
- `apps/webstore/app/dashboard/purchases/page.tsx`
- `apps/webstore/app/dashboard/support/page.tsx`
- `apps/webstore/app/dashboard/profile/page.tsx`

**Files modified:**
- `apps/webstore/app/layout.tsx` — replaced server-side getUser with AuthHeader client component
- `apps/webstore/app/globals.css` — added auth + dashboard + badges CSS
- `apps/api/src/server.ts` — added auth routes, CORS, cookie plugin registration
- `apps/api/package.json` — added bcryptjs, @fastify/cookie@9
- `scripts/runtime/start` — removed publisher references

## Remaining Work: Phase 3 — Support Tickets Resource

- Define `support_tickets` resource in core metadata
- Add to API registry
- Add admin panel nav
- Wire up user portal ticket list (replace localStorage with API calls)

## Remaining Work: Phase 4 — Polish

- Add `/dashboard` link in header when logged in
- Add `/dashboard` link in footer
- Add `/dashboard` link in mobile menu (if applicable)
