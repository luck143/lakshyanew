# ADR-004: Alternative Stack — PHP/Laravel + Filament

**Status:** Alternative (not chosen) · **Date:** 2026-07-19

## Context
Team may be PHP-strong. Filament is itself a metadata-driven Laravel admin that could preserve the
"define a resource → auto admin UI" philosophy with far less rewrite than a full TS stack.

## Assessment
**Pros**
- Metadata-driven admin is built-in (Filament resources ≈ old `dimensions()` + auto CRUD UI).
- Team familiarity; smaller retraining; keeps PHP/ClickHouse/MariaDB as-is.
- Faster admin delivery than building a generic React renderer from scratch.

**Cons / Trade-offs**
- Public-site SSR/ISR and SEO story weaker than Next.js (Livewire/Inertia help but lag Next).
- TypeScript codegen-from-schema ecosystem is stronger in JS; less automatic end-to-end type safety.
- Panel already AngularJS → Filament replaces it cleanly, but public `web/*.php` still needs rebuild.
- Per brief, default target is Next.js; this is the fallback if PHP retention is mandated.

## Decision
Default to Next.js (ADR-001). Adopt Laravel+Filament **only if** the team explicitly requires PHP
retention or lacks TS capacity. Either way the *metadata model* (one resource definition → API+admin)
is the constant; only the implementation runtime changes.
