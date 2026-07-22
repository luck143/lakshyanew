# ADR-001: API Framework Choice

**Status:** Proposed · **Date:** 2026-07-19

## Context
The existing system uses a custom PHP router (`api/index.php`) + per-resource `process_<method>()`
files + a metadata compiler (`apiCore.php`). We must preserve the metadata-driven philosophy while
modernizing. Two shapes are viable: (A) single Next.js monolith with Route Handlers, (B) Next.js
frontends + separate NestJS API.

## Decision
**Option A — Single Next.js monolith** as the starting point.
- API implemented as Next.js Route Handlers under `app/api`, isolated behind `packages/core`
  (framework-agnostic ResourceRegistry + generic controller).
- This keeps one deploy, one language, and the lowest added complexity (per the brief's constraint:
  "improve without making it significantly more complex").

## Rationale
- The metadata engine is the valuable IP, not the HTTP framework. Keeping it in `packages/core`
  makes the API extractable to NestJS later (Option B) with no rewrite of resource definitions.
- NestJS modules/guards/pipes map cleanly to old `api_access_check` / `validate_inputs` / `boot`,
  so extraction is low-risk if scale demands it.

## Consequences
- ✅ Fastest path; unified type safety via codegen.
- ⚠️ API is not a standalone deployable initially (acceptable; reversible).
- 🔁 Revisit at Phase 3 if independent API scaling is needed → promote `app/api` to `apps/api` (NestJS).

## Alternatives considered
- NestJS from day one (Option B): cleaner boundary but two runtimes, more ops, slower start.
- Stay on PHP/Laravel + Filament: see ADR-004.
