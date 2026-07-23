# Resource Definitions as JSON Files — Single Source of Truth

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make a version-controlled JSON file per resource the single source of truth. The Prisma schema (DB tables), the API CRUD, the admin UI, and the codegen artifacts must all be *derived* from those JSON files — never hand-maintained in parallel.

**Architecture:**
- Every resource lives as `packages/core/resources/<name>.json` (pure data, no code).
- A loader in `@lakshya/core` reads those files at boot and registers them into the registry (replaces `apps/api/src/resources.ts`).
- A generator (`pnpm gen:schema`) reads the registry and emits `apps/api/prisma/schema.prisma`; `prisma generate` + `prisma db push` create/update the physical tables. This makes the DB *derived* from the definitions.
- API (`crud.ts`) and admin (`server.ts`) stay 100% metadata-driven and need zero per-resource code — they already are; they just consume the registry, which now comes from files.
- The Resource Builder UI lists/edits ALL resources (file-backed), not just a `lakshya_resource` DB table. The `lakshya_resource` table is retired (it was the wrong place for definitions).
- Runtime-created resources also persist as JSON files (in `packages/core/resources/`), so there is exactly ONE source of truth.

**Tech Stack:** TypeScript, Node `fs`, Prisma (postgres), `@lakshya/core` registry, Fastify (admin/api). No new runtime dependencies.

---

## Current State (verified)
- `apps/api/src/resources.ts` — 22 resources defined via `defineResource({...})`. Pure JSON-compatible (only a top `import` line; no functions/computed values), so each can be auto-converted to JSON.
- `packages/codegen/src/run.ts` — imports `resources.ts`, then registers ~19 more via inline `defineResource`, totalling 47 registered resources.
- `apps/api/prisma/schema.prisma` — 42 hand-written `model`s (the DB tables), maintained separately from the definitions (the duplication).
- `apps/api/src/builder-store.ts` — persists 6 test resources in a `lakshya_resource` **DB table**. This is the wrong home for definitions; it is removed by this plan.
- `packages/core/src/builder.ts` already has `createTableSql()`, `normalizeResource()`, `sqlTypeFor()` — reused by the schema generator.
- `packages/codegen/src/generate.ts` already emits OpenAPI/TS/zod from the registry — proves the "definition → artifacts" loop.

## Target Layout
```
packages/core/
  resources/            # <-- SINGLE SOURCE OF TRUTH (git-tracked JSON)
    tenant.json
    user.json
    ... (one per resource, all 47)
  src/
    loader.ts           # reads resources/*.json -> registry (NEW)
    registry.ts         # add loadResourceFiles() (exists: upsert/unregister)
index.ts               # export loader
apps/api/
  prisma/schema.prisma  # GENERATED from resources (do not hand-edit)
  src/
    server.ts           # loadResourceFiles() instead of import './resources.js'
    resources.ts        # DELETED
    builder-store.ts     # repurposed: write JSON files, not a DB table
scripts/
  gen-schema.mjs        # registry -> schema.prisma (NEW, run via pnpm gen:schema)
```

---

## Phase A — JSON files become the source of truth

### Task A1: Create JSON format + one canonical example
**Objective:** Define the exact JSON shape (identical to the `defineResource({...})` object) and write `user.json`.
**Files:** Create `packages/core/resources/user.json`
**Step 1:** Write `user.json` by converting the existing `User` def (resources.ts:26-45) to JSON (drop `export const User = defineResource(` and `);`). Shape:
```json
{
  "name": "user",
  "table": "User",
  "label": "User",
  "labelPlural": "Users",
  "group": "Access Control",
  "icon": "user",
  "fields": {
    "id": { "type": "uuid", "label": "ID", "generated": true, "visible": ["list","get"] },
    "email": { "type": "string", "label": "Email", "required": ["create","update"], "editable": ["create","update"], "visible": ["list","get","create","update"], "validate": { "email": true }, "ui": { "columns": true, "filterable": true, "searchable": true, "render": "link", "href": "mailto:{email}", "group": "Account" } },
    "name": { "type": "string", "label": "Name", "editable": ["create","update"], "visible": ["list","get","create","update"], "ui": { "columns": true, "filterable": true, "group": "Account", "placeholder": "Full name" } },
    "role": { "type": "enum", "label": "Role", "options": { "network": "Network", "publisher": "Publisher", "user": "User" }, "default": "user", "editable": ["create","update"], "visible": ["list","get","create","update"], "ui": { "columns": true, "filterable": true, "render": "badge", "group": "Access" } },
    "roles": { "type": "json", "label": "Direct SOM grants", "editable": ["create","update"], "visible": ["get","create","update"], "ui": { "group": "Access", "input": "textarea", "help": "Raw JSON triple-store grants." } },
    "permissions": { "type": "tags", "label": "Permissions", "editable": ["create","update"], "visible": ["list","get","create","update"], "ui": { "group": "Access" } },
    "status": { "type": "enum", "label": "Status", "options": { "active": "Active", "inactive": "Inactive", "banned": "Banned" }, "default": "active", "editable": ["create","update"], "visible": ["list","get","create","update"], "ui": { "columns": true, "filterable": true, "render": "badge", "group": "Access" } }
  },
  "scopes": { "admin": { "access": "network" } },
  "listView": { "columns": ["email","name","role","status"], "defaultSort": "email", "pageSize": 50 },
  "filters": ["role","status"]
}
```
**Step 2:** Verify it parses: `node -e "JSON.parse(require('fs').readFileSync('packages/core/resources/user.json','utf8')); console.log('ok')"` → `ok`
**Step 3:** Commit.

### Task A2: Write `loader.ts` in core
**Objective:** A function that loads every `*.json` in `resources/` into the registry.
**Files:** Create `packages/core/src/loader.ts`; Modify `packages/core/src/index.ts` (add `export * from './loader.js';`)
**Step 1:** Write `loader.ts`:
```ts
import { readdirSync, readFileSync } from 'node:fs';
import { registry } from './registry.js';

const DIR = new URL('../resources/', import.meta.url);

export function loadResourceFiles(dir: URL = DIR): number {
  let n = 0;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const def = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    registry.upsert(def); // upsert so reloads/overrides win over stale copies
    n++;
  }
  return n;
}
```
**Step 2:** Export it from `index.ts`.
**Step 3:** Build core: `pnpm --filter @lakshya/core run build` → success.
**Step 4:** Commit.

### Task A3: Auto-convert all existing code-defined resources to JSON
**Objective:** Replace `resources.ts` (+ codegen inline defs) with JSON files, no manual rewriting.
**Files:** Create `packages/core/resources/*.json` (all 47); Delete `apps/api/src/resources.ts`
**Step 1:** Write a one-off script `scripts/ts-to-json.mjs` that imports the current registry (via `tsx`), iterates `registry.all()`, and writes `packages/core/resources/<name>.json` (pretty JSON, 2-space). Skip none.
**Step 2:** Run `node --import tsx scripts/ts-to-json.mjs` (or `pnpm exec tsx`). Verify: `ls packages/core/resources/ | wc -l` == 47 (or == registry count).
**Step 3:** Sanity-check one converted file equals A1's hand-written `user.json` shape.
**Step 4:** Delete `apps/api/src/resources.ts`.
**Step 5:** Commit.

### Task A4: Wire the loader into API + admin + codegen
**Objective:** Boot loads definitions from JSON files, not `resources.ts`.
**Files:** Modify `apps/api/src/server.ts:35`; Modify `packages/codegen/src/run.ts:9`
**Step 1:** In `server.ts`, replace `import './resources.js'; // registers resources` with:
```ts
import { loadResourceFiles } from '@lakshya/core';
loadResourceFiles();
```
**Step 2:** In `codegen/run.ts`, replace the `pathToFileURL(...resources.ts)` import with `loadResourceFiles()` (import from `@lakshya/core`).
**Step 3:** Build api + admin + codegen. Start api; hit `GET /api/meta` → still returns all 47 resources.
**Step 4:** Commit.

---

## Phase B — DB tables derived from JSON

### Task B1: Write `scripts/gen-schema.mjs`
**Objective:** Emit `schema.prisma` from the registry so tables are derived from definitions.
**Files:** Create `scripts/gen-schema.mjs`; Modify `package.json` (add `"gen:schema"` script)
**Step 1:** Script: `loadResourceFiles()`; for each `registry.all()` resource, emit a `model <Table> { ... }`. Type map (key part):
```js
const PRISMA = {
  uuid:'String @id @default(uuid())', int:'Int', float:'Float', bool:'Boolean',
  date:'DateTime', datetime:'DateTime @default(now())', json:'Json', tags:'Json',
  computed:'Json', virtual:'Json', enum:'String', relation:'String', media:'String',
  url:'String', string:'String', text:'String', richtext:'String'
};
```
- Prepend `tenantId String` for tenant-scoped resources (per `hasTenantFor`/ADR-002).
- Add `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt` unless field exists.
- For `relation` fields, emit `String` FK column (relations resolved at read-time, same as today).
- Keep `datasource`/`generator` blocks from current schema header.
**Step 2:** Run `node scripts/gen-schema.mjs`; diff the generated `schema.prisma` `model` blocks against the current hand-written ones — they must describe the SAME tables/columns (this proves no data loss on push).
**Step 3:** Commit (generated file is git-tracked; do not hand-edit it).

### Task B2: Apply schema to the database (non-destructive)
**Objective:** Create/update physical tables from definitions without dropping data.
**Files:** `apps/api/prisma/schema.prisma` (generated)
**Step 1:** Snapshot row counts first: `psql ... -c "SELECT 'User', count(*) FROM \"User\" UNION ALL SELECT 'Topic', count(*) FROM \"Topic\";"` (a few tables) → save.
**Step 2:** `pnpm --filter @lakshya/api exec prisma generate` → success.
**Step 3:** `pnpm --filter @lakshya/api exec prisma db push --skip-generate` → success, prints "already in sync" or applies additive changes. `db push` does NOT drop columns/tables for compatible schemas.
**Step 4:** Re-run the row-count query → counts unchanged (proves no data loss).
**Step 5:** Commit.

### Task B3: Retire the `lakshya_resource` table approach
**Objective:** Definitions no longer live in a DB table.
**Files:** Modify `apps/api/src/builder-store.ts`; Modify `apps/admin/src/server.ts` builder routes
**Step 1:** Migrate the 6 existing `lakshya_resource` rows to JSON files: script reads `lakshya_resource`, writes `packages/core/resources/<name>.json`, then `DROP TABLE lakshya_resource`.
**Step 2:** Change `createBuilderResource` to write a JSON file (`packages/core/resources/<name>.json`) + call `loadResourceFiles()` + `scripts/gen-schema.mjs` + `prisma db push` (via child_process, admin-guarded endpoint OR a documented CLI the UI invokes). Add `createTableSql()` as an immediate fallback so the table exists even before the next `db push`.
**Step 3:** Change `deleteBuilderResource` to delete the JSON file (and optionally the table via `dropBuilderTable`).
**Step 4:** Build + start; create a resource via UI → JSON file appears, table created, row CRUD works.
**Step 5:** Commit.

---

## Phase C — Resource Builder UI lists/edits ALL resources

### Task C1: Builder list shows every resource (file-backed)
**Objective:** The "Existing builder resources" box lists all 47 from the registry, not just 6.
**Files:** Modify `apps/admin/src/server.ts` (`/_builder/api/list` handler + client box)
**Step 1:** Change `/_builder/api/list` to return `registry.all().map(r => ({name,label,table}))` (all resources), marking `source: 'file'`.
**Step 2:** Update the client box to render all items with an "Edit" link; for file-backed ones, Edit opens the JSON in the existing `/_builder/:name` editor pre-filled.
**Step 3:** Verify in browser: builder list shows Tenant, User, Topic, ... Lead, Project Note, etc.
**Step 4:** Commit.

### Task C2: Edit writes back to JSON
**Objective:** Saving an edit in the builder updates the JSON file (source of truth) and re-syncs.
**Files:** Modify `apps/admin/src/server.ts` (`/_builder/api` POST/PUT`) + `builder-store.ts`
**Step 1:** On save, write `packages/core/resources/<name>.json`, `registry.upsert(def)`, regenerate schema + `db push` (or note "run `pnpm gen:schema` to apply table changes").
**Step 2:** For compile-time/Prisma-backed resources, block table drops (never `DROP` a Prisma table from the UI) — only update the definition file.
**Step 3:** Edit `user` via UI → `user.json` updated, admin reflects change after reload.
**Step 4:** Commit.

---

## Phase D — Verification across all 47 resources

### Task D1: Full sweep
**Objective:** Prove every resource is definition-driven end-to-end.
**Files:** None (test only)
**Step 1:** For each of the 47 resources: `GET /api/<name>` returns 200; admin `/<name>` renders; `GET /api/meta` lists all 47.
**Step 2:** `GET /api/<name>?q=xyz` search works (uses the OR fix from prior pass).
**Step 3:** `pnpm run build` clean; `pnpm run typecheck` clean.
**Step 4:** Spot-check 3 resources in the browser (list, create, edit, delete, CSV, search).
**Step 5:** Commit final.

---

## Risks / Tradeoffs
- **Prisma `db push` is additive** for compatible schemas (won't drop data), but a column *type* change can fail — verify row counts before/after. Keep a DB backup/snapshot before B2.
- **Relation columns:** today relations are stored as `String` FK + resolved at read-time (no Prisma `@relation`). Keep that model in the generator to avoid migration complexity.
- **uuid ids:** existing tables use `String @id @default(uuid())` (uuid-as-string). Generate that exact shape to match, not `TEXT`, so `db push` sees no diff.
- **Rebuild vs runtime:** Creating a resource via the UI now requires a schema/table sync step (CLI or admin action). This is acceptable because definitions are files (git-tracked) — the user explicitly wants files as source of truth, which implies a generate step. The immediate `createTableSql()` fallback keeps new tables usable without waiting for `db push`.

## Open Questions (answer before Phase B if unsure)
1. Should new UI-created resources be written to `packages/core/resources/` (shared) or a separate `apps/api/resources/` dir? (Recommend `packages/core/resources/` so core owns the source of truth.)
2. Is `prisma db push` acceptable, or do you require formal `prisma migrate` files? (`db push` is simpler and non-destructive for this case; migrations can be added later.)
3. Keep the runtime raw-SQL adapter as a fallback, or go 100% Prisma after B2? (Recommend keep as fallback for zero-downtime new-table creation.)
