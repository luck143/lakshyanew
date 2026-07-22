# Lakshya Panel — Migration & Architecture Analysis

**Source project:** `/home/neo/projects/lakshya/` (PHP, ~2,555 PHP files, 335 MB)
**Target project:** `/home/neo/projects/lakshyanew/` (modern stack, metadata-driven core preserved)
**Status:** Analysis + Planning (no implementation code yet)
**Date:** 2026-07-19

---

## 0. Executive Summary

Lakshya Panel is a PHP-based, multi-tenant educational LMS + e-commerce platform. Its most valuable and distinctive property is a **metadata-driven API framework**: every resource declares its fields once in a `dimensions()` function, and that same declaration powers validation, CRUD, discovery, and (partially) the admin UI. The framework is small, consistent, and battle-tested across ~165 API endpoint files.

The migration goal is **not** to rewrite the product. It is to:
1. Re-implement the same metadata-driven philosophy on a modern, type-safe, SSR-capable stack.
2. **Complete** the metadata loop the old system left unfinished — the admin panel is *not* fully generated today (every resource has a hand-written PHP page in `panel/network/`). The new system should generate admin CRUD pages from metadata with only exceptional overrides.
3. Keep resource-specific code near zero: declaring a resource on the backend should auto-produce its API + admin UI.

**Recommendation (detailed in §14):** Next.js (App Router) + a TypeScript service layer that is *itself* generated from backend schema/metadata, OR a hybrid where the API is a separate NestJS/Node service and Next.js consumes it. The metadata engine should be the single source of truth driving both the API and the React admin. ClickHouse stays for analytics; Postgres replaces the MySQL transaction store and (optionally) ClickHouse for primary CRUD if a migration is desired.

---

## 1. Existing Project Analysis

### 1.1 Topology
Four logical surfaces served by URL routing on one PHP code tree:

| Surface | Path | Tech | Purpose |
|---|---|---|---|
| Public web | `/web/` | PHP server-rendered (Bootstrap 5.3.3) | SEO-facing student/learner site, quiz taking, storefront |
| Admin panel (network) | `/panel/network/` | PHP + Angular 1.x | Superadmin / network-admin (143 hand-written pages) |
| Admin panel (publisher) | `/panel/publisher/` | PHP + Angular 1.x | Content creators — own auth, storefront mgmt, billing, tickets |
| API gateway | `/api/` | PHP (custom router) | JSON API, JWT auth, ClickHouse/MariaDB |
| Docs | `/doc/` | PHP auto-generated from `api/packages/` | API discovery + simulator |

> **Two distinct admin surfaces**, not one: `network` (full platform admin) and `publisher`
> (scoped creator/storefront admin). Both must be supported by the generic renderer (§11.13).

**Subsystems of note (not obvious from a top-level scan):**
- **Contacts / CRM + Email Marketing** (`api/packages/contacts/*`, 12 files): contacts, lists, tags,
  campaigns, templates, outbound `email`, inbound `recieved_email` (with `reply`), link tracking, SMTP config.
- **Email ingestion** (`jobs/mail/*.php`): IMAP polling (`imap_open`) → `recieved_emails`.
- **Dynamic image service** (`imgen/`): resize/crop, OG/social card rendering, croppers — more than storage.
- **Events/webinars** (`network/event.php`, `web/event_*.php`): events with tickets.
- **Social login** (Facebook/Google) in publisher auth + `helpers/hybidauth`.
- **Scheduled jobs** (`cron/*.php`, 17 jobs) + `jobs/` scripts (email, exam/image CDN shifts, quiz fixes).

### 1.2 Request / routing model
- **API router** (`api/index.php`): maps clean URL `/api/<v1>/<v2>/<v3>/<v4>/<v5>/<v6>` → `api/packages/<v1>/<v2>(/<v3>).php`. Calls `process_<method>()` from the file.
- **Web router** (`web/index.php`): maps `/web/<v1>/<v2>/<v3>` → `web/<v1>.php` or `web/<v1>/<v2>.php`.
- **Panel router** (`panel/index.php`): resolves domain → `PANEL_TYPE`, then loads `panel/<package>/<page>.php`.
- `.htaccess` + `deploy/nginx/default.conf` mirror these rewrites for Apache/Nginx.

### 1.3 The metadata-driven core (the crown jewel)
Every API resource file follows a strict contract:

```php
<?php
api_access_check('network', 'role_developer');   // authorization
include_once(__DIR__ . '/function.php');          // package helpers
boot("add,edit,fetch,fetchone,delete,bulkJob,optimize");  // declared methods

function dimensions($type = '') {                 // THE METADATA DECLARATION
    global $vars;
    $vars['table'] = PREFIXLAKSHYA . "topic";
    $vars['conn']  = "saas";
    $vars['entity'] = "Topic";
    $dim['name'] = [ "common" => ["type"=>"text","label"=>"Name", ...],
                     "add"    => ["include"=>true,"required"=>true],
                     "edit"   => ["include"=>true,"required"=>true],
                     "fetch"  => ["include"=>true] ];
    return parse_attributes(@$dim, @$type);
}
function process_add()   { /* get_requirements(); validate_inputs(); map_inserts_from_requirements(); chouse_insert(); */ }
function process_edit()  { /* append-only update */ }
function process_fetch() { /* list + pagination */ }
function process_fetchone(){ /* by id */ }
function process_delete(){ /* */ }
```

Key engine files (preserve the *concepts* of these):
- `helpers/api/apiCore.php` — `boot()`, `get_requirements()`, `parse_attributes()`, `all_requirements`, `all_requirements_enhanced`, `table_requirements`, `uniques_requirements`, `safe_requirements`, `get_requirements_enhanced`. This is the **metadata compiler**.
- `helpers/api/validationHandler.php` — `validate_inputs()`, `validate_input()`, `required_check()`, `map_inserts_from_requirements()`, `build_requirements()`. The **validation + mapping** layer.
- `helpers/api/apiHandler.php` — `apiexit()`, `api_access_check()`, `is_permission()`, `modules_access()`. **Response + authz**.
- `helpers/api/saasApiHandler.php` — JWT decode, `get_network_details()`, `get_network_domains()`. **Tenant + auth**.
- `helpers/api/chouseHandler.php` — ClickHouse query abstraction (`chselect`, `chouse_insert`, `chquery`, `cached_chselect`). **Data layer**.

### 1.4 How metadata flows today
```
dimensions()  ──►  parse_attributes(type)
                        ├─► per-method field set (add/edit/fetch/...)
                        ├─► all_requirements  (full spec per method)
                        └─► requirements_enhanced (http_method, examples, errors)
API endpoint (/resource/all_requirements)  ──►  consumed by:
   • /doc/ simulator (human-readable)
   • panel/network/*.php pages  (calls call_api($pkg/$method/all_requirements))
        └─► generate_filters(), generate_columns(), generate_theads_new(),
            generate_top_bar() in helpers/panel/panelUI.php
```

### 1.5 The gap (why admin is only *partially* metadata-driven)
`panel/network/events.php` (and ~143 sibling pages) are **hand-written**: each page hard-codes which columns to render (`<td ng-if="mainData.rcolumns.id">`), which actions exist, and the entity/package/method strings. The metadata tells the panel *which fields and filters exist*, but the **page shell, column order, layout, and actions are duplicated per resource**. That is the highest-leverage improvement for the new system: make the panel a single generic renderer driven entirely by `all_requirements` + a small per-resource "view config".

### 1.6 Data stores
- **ClickHouse** — primary OLTP for most resources (`conn = "saas"`, plus `blogdb`, `ecomdb`). Append-only updates (`process_edit` inserts a new version; reads use `FINAL`).
- **MariaDB** — referenced in `docker-compose.yml` (mysql:11) for transactional data.
- No migration SQL files exist in repo; schema is defined implicitly by code + ClickHouse DDLs elsewhere.

### 1.7 Auth & permissions
- JWT (HS256, Firebase JWT). `saas_validate_token()` decodes, loads user, checks `status==active`.
- Three API access tiers: `api_access_check('network', 'role_developer')` (admin only), `api_access_check('publisher')` (both domains), `api_access_check()` (any authed user).
- Permissions stored as array `$GLOBALS['user']['permissions']` with roles `role_superadmin`, `role_admin`, plus granular `role_*` flags. `is_permission()` + `modules_access()` gate fields and endpoints.
- `user_` prefix on a resource = **data scope** (current user's rows), not location/domain.

### 1.8 Notable quirks / risks
- Heavy use of `$GLOBALS` as shared state (user, vars, data, hd). Will not translate directly; use DI/context.
- Append-only ClickHouse means "edit" = insert new version; "delete" = tombstone (`status`). New stack can keep this or switch to normal updates on Postgres.
- `parseFilters()` / `chvar()` / `tag_builder()` encode a bespoke filter DSL. Must be re-specified cleanly.
- Panel is AngularJS 1.x — end-of-life. Full rewrite needed regardless.
- 335 MB repo includes large `assets/`, `imgen/`, media. Migrate code + schema only; media via object storage.

---

## 2. Proposed Architecture (target)

### 2.1 Guiding principle
> **One schema definition → generated API + generated admin UI + generated TypeScript client + generated docs.**

The backend resource definition is the single source of truth. The metadata engine is a **first-class library**, not scattered helpers.

### 2.2 High-level diagram
```
┌──────────────────────────────────────────────────────────────┐
│  Browser                                                      │
│   ├─ Public site (Next.js, SSR/ISR)  ──┐                      │
│   └─ Admin console (Next.js, CSR)    ──┤                      │
└──────────────────────────────────────────────────────────────┘
                                          │  JSON (typed)
                     ┌────────────────────┴───────────────────┐
                     │  API service (NestJS or Next Route Handlers) │
                     │   • Auth/JWT (preserve HS256 compat)    │
                     │   • Metadata engine (resource registry) │
                     │   • Generic CRUD controller (per resource)│
                     │   • Validation (from schema)            │
                     └───────────────┬────────────────────────┘
                                     │
              ┌──────────────────────┼───────────────────────┐
              │                      │                        │
        ┌─────┴─────┐        ┌───────┴──────┐         ┌──────┴──────┐
        │ Postgres  │        │  ClickHouse  │         │  Object     │
        │(OLTP/CRM) │        │ (analytics,  │         │  Storage    │
        │           │        │  quiz logs)  │         │ (S3/R2)     │
        └───────────┘        └──────────────┘         └─────────────┘
```

### 2.3 Where the metadata engine lives
- **Backend**: a `ResourceRegistry` where each resource is a class/object declaring fields, types, relations, permissions, validation, indexes, UI hints. A generic controller reads the registry to expose `list / get / create / update / delete / bulk`.
- **Admin UI**: a generic `<ResourcePage resource="topic" />` React component reads the same metadata (served at `/api/meta/<resource>` or via server component fetch) and renders list, filters, form, detail — zero per-resource pages.
- **Public site**: uses typed data via the same API (read-only scopes).
- **Codegen**: a `generate` step emits TypeScript types + API client + OpenAPI from the registry, so the frontend is type-safe against the backend without manual sync.

This **completes** the loop the old system left open.

---

## 3. Proposed Folder Structure (lakshyanew)

```
lakshyanew/
├─ apps/
│  ├─ web/                 # Next.js public site (SSR/ISR) — students
│  ├─ admin/               # Next.js admin console (generic metadata renderer)
│  └─ api/                 # API service (NestJS) OR Next route handlers (see §14)
├─ packages/
│  ├─ core/                # metadata engine, ResourceRegistry, types
│  ├─ db/                  # Prisma schema, migrations, clients
│  ├─ auth/                # JWT, session, RBAC
│  ├─ ui-admin/            # generic ResourcePage, FieldRenderer, Table, Form
│  ├─ ui-web/              # public design system (teal/amber tokens per DESIGN.md)
│  └─ codegen/             # schema → TS types/OpenAPI/client generator
├─ prisma/                 # schema.prisma + migrations
├─ infra/                  # docker-compose, nginx, CI
├─ docs/                   # this document + ADRs, module docs, api docs
└─ scripts/
```

Monorepo via npm/pnpm workspaces (single deployable, but clean separation). This satisfies the "no monolithic repo" hygiene while keeping one project.

---

## 4. Backend Architecture

- **Language:** TypeScript (Node 20+).
- **Framework:** Either NestJS (recommended for the explicit module/guard/pipe structure that mirrors the old `api_access_check` + `validate_inputs` split) **or** Next.js Route Handlers if you prefer a single Next app. See ADR-001.
- **Resource registry** (`packages/core`):
  ```ts
  defineResource({
    name: 'topic',
    table: 'topics',
    fields: {
      id:        { type: 'uuid', pk: true, generated: true },
      name:      { type: 'string', label: 'Name', required: ['add','edit'],
                   validate: { min: 1, max: 200 } },
      parentId:  { type: 'relation', to: 'topic', label: 'Parent' },
      status:    { type: 'enum', options: ['active','hidden','pending'], default: 'active' },
      content:   { type: 'richtext', sanitize: true },
      // UI hints live in the same declaration
      listView:  { columns: ['name','parentId','status'], sortable: ['name','status'] },
      filters:   ['status','parentId'],
    },
    scopes: {
      admin:   { access: 'network', perm: 'role_developer' },
      user:    { access: 'publisher' }, // data scoped to current user
    },
  })
  ```
- **Generic controller** exposes for every registered resource:
  `GET /api/<resource>` (list+filter+sort+paginate),
  `GET /api/<resource>/:id`,
  `POST /api/<resource>`,
  `PATCH /api/<resource>/:id`,
  `DELETE /api/<resource>/:id`,
  `POST /api/<resource>/bulk`,
  `GET /api/meta/<resource>` (the new `all_requirements` — drives admin UI).
- **Validation** derived from field defs (zod schema auto-built from registry).
- **Authz**: guard reads `scopes`, checks JWT role + permission flags (preserve `role_superadmin/role_admin` semantics).
- **Append-only option**: keep ClickHouse-style versioning as a *configurable* behavior (`versioned: true` → insert new row; reads use `latest`). Default off for Postgres.

---

## 5. Frontend Architecture

### 5.1 Public website (`apps/web`)
- Next.js App Router, **SSR for dynamic pages, ISR for content that changes hourly, SSG for truly static marketing pages**.
- Quiz-taking pages: **CSR after the shell** (timer/state) but the landing/result pages SSR for SEO + social share.
- Design tokens from `DESIGN.md` (teal #02767D / #0D9488, amber #F59E0B, Inter + Outfit) encoded as CSS variables / Tailwind theme.

| Page type | Strategy | Why |
|---|---|---|
| Home, topic landing, quizset landing | **SSR** (or ISR 60–600s) | SEO, social cards, personalized only via client fetch |
| Blog posts, notes, articles | **ISR** (revalidate on publish) | SEO + freshness, cheap |
| Quiz engine (take/answer) | **CSR** in an SSR shell | real-time state, timer; shell SSR for crawlability |
| Rankings, dashboards | **CSR** (auth) | personalized, no SEO need |
| Sitemaps, robots | **SSG/route** | static |

### 5.2 Admin console (`apps/admin`)
- Next.js, **client-rendered** (auth wall, no SEO).
- A **single generic renderer** `ResourcePage` driven by `GET /api/meta/<resource>` + optional per-resource view config override.
- Components: `ResourceTable`, `ResourceForm` (field-type → input component map: text/select/relation/richtext/tags/enum/date…), `ResourceFilters`, `ResourceDetail`, `BulkActions`.
- Navigation/sidebar generated from the registry (only resources the user's role can access).
- Eliminates the ~143 hand-written `panel/network/*.php` pages.

---

## 6. Database Design & Migration Strategy

### 6.1 Target stores
- **Postgres** = system of record for ALL resources (users, topics, quiz_set, notes, ecom products/orders, blog, etc.). Normalized, with FK relations (the old `parentid`, `examid`, `parent_ecom` etc. become real relations). **[CONFIRMED by user 2026-07-19]**
- **ClickHouse** = used **ONLY** for log/event storage: activity logs, API logs, quiz attempts, answer logs, rankings, message logs. No business/CRUD data in ClickHouse.
- **Object storage** (S3/R2) for media (`assets/`, `imgen/`, uploads) — not in the repo or DB.

### 6.2 Schema source of truth
`prisma/schema.prisma` is the canonical schema AND feeds the metadata registry (single definition, two consumers). This is the cleanest realization of "define once."

### 6.3 Migration path (zero-downtime, verified)
1. **Reverse-engineer current schema** from code (field names in `dimensions()` + ClickHouse DDLs). Produce `schema.prisma` v1.
2. **Stand up new Postgres** with Prisma migrations.
3. **Dual-write / backfill**: a one-off ETL job (script in `scripts/`) reads from **MariaDB** (the CRUD/transaction store), transforms (JSON blobs → relations, `tag_builder` strings → join tables), writes to Postgres. ClickHouse is **not** a source for business data — only its log/event tables are retained as-is for analytics. Run in batches, checksum counts.
4. **Shadow-read validation**: run old + new read paths in parallel for a sample, diff outputs.
5. **Cut over** per module (start with low-risk: topics, blog; then ecom; then quiz attempts last).
6. **Archive** old DB access behind a read-only adapter until decommission.

> Migrating *away* from ClickHouse as primary OLTP is recommended (append-only + FINAL is costly and the old code fights it constantly). Keep ClickHouse only where it earns its keep.

---

## 7. Authentication & Authorization (preserved semantics)

- **JWT HS256** with the **same secret/config** so existing issued tokens keep working during cutover (or a short dual-token window).
- User model: `uid`, `role` (`network`/`publisher`/`user`), `permissions[]` (granular `role_*` flags), `status`.
- RBAC layer maps old `api_access_check($role,$perm,$modules)` → NestJS guard reading `scopes` from registry + `is_permission` equivalent.
- `modules_access()` → feature-flag table (network settings). Preserve `required_modules`/`required_permissions`/`required_settings` field-level gating from `parse_attributes`.
- Multi-tenant: `get_network_details(domain)` → tenant context injected per request (Postgres row-level tenancy or `tenant_id` column). **Decide tenancy model in ADR-002** (schema column vs DB-per-tenant). For Lakshya's scale, a `tenant_id` column + middleware is simplest and recommended.

---

## 8. Metadata-Driven Framework Design (the heart)

### 8.1 What to carry forward (verbatim philosophy)
- One declaration per resource; field defs carry: type, label, validation, visibility per operation (add/edit/fetch), UI hints, relations, permissions.
- Auto-generated CRUD + validation + admin UI + docs from that declaration.
- `all_requirements` → becomes `GET /api/meta/<resource>` returning a typed schema the admin consumes.

### 8.2 What to improve (without much added complexity)
1. **Close the admin loop** — generic renderer, no per-resource pages (§5.2).
2. **Typed codegen** — registry → zod validators (backend) + TS types + API client + OpenAPI (frontend). No manual drift.
3. **Relations as first-class** — old `parentid`/`examid` become `relation` fields; the form renders a lookup, the list renders a link, the filter renders a select. The metadata *declares* the relation; the engine *renders* it.
4. **Field types expanded** — beyond text/select/int: `relation`, `richtext` (sanitized), `media` (upload to object store), `tags`, `json`, `computed` (server expression), `virtual` (not stored, derived).
5. **View config as override, not replacement** — most resources need only the declaration; a few (quiz engine, rankings) supply a small `viewConfig` for custom layout. This keeps "resource-specific code to an absolute minimum" while allowing escape hatches.
6. **Extend metadata to other surfaces** (the brief asks): 
   - **Public site**: a `webView` block in the resource can drive listing/landing pages (topic → landing page, quiz_set → quizset landing). Reduces bespoke `web/*.php`.
   - **API docs**: generated from the same registry (replaces `doc/` simulator).
   - **Validation/forms on public site**: same field defs power public submission forms (contact, application).
   - **Seed/data fixtures**: registry can emit seed templates.

### 8.3 Metadata schema (TypeScript sketch)
```ts
type FieldType = 'uuid'|'string'|'text'|'richtext'|'int'|'float'|'bool'
               |'enum'|'date'|'datetime'|'relation'|'media'|'tags'|'json'
               |'computed'|'virtual';
interface Field {
  type: FieldType;
  label: string;
  description?: string;
  required?: Op[];                 // ['add','edit']
  visible?: Op[];                  // ['fetch','list']
  validate?: { min?, max?, regex?, unique?, email? };
  options?: Record<string,string> | RelationRef;
  default?: any;
  ui?: { widget?, placeholder?, help?, columns?, sortable?, filterable? };
  permissions?: { modules?, perms?, settings? };
}
interface Resource {
  name: string; table: string;
  fields: Record<string, Field>;
  relations?: Relation[];
  scopes: { admin?, user?, public? };
  listView?: { columns: string[]; defaultSort?: string; pageSize?: number };
  filters?: string[];
  webView?: { landing?: boolean; slugField?: string };  // public-site extension
  versioned?: boolean;
}
```

---

## 9. API Conventions & Standards

Preserve the good parts, formalize the rest:

| Concern | Old | New |
|---|---|---|
| Base path | `/api/<pkg>/<res>/<method>` | `/api/<resource>/<op>` generic; keep `/api/<pkg>/...` alias for compat during cutover |
| Auth | `Bearer` JWT | same |
| Response | `{status:1, data, message}` | same envelope (preserve clients) **or** standard `{data,error}` — ADR-003 |
| CRUD ops | `add/edit/fetch/fetchone/delete/bulkJob` | `POST /`, `PATCH /:id`, `GET /`, `GET /:id`, `DELETE /:id`, `POST /bulk` (RESTful) with legacy method names aliased |
| Pagination | `page`, `limit`, `sortby`, `sortorder`, `columns` | same names (preserve frontend contract) |
| Filtering | `filters:{and:[],or:[]}` + flat params | same DSL, typed |
| Metadata | `all_requirements`, `requirements`, `requirements_enhanced` | `GET /api/meta/<resource>` (+ `/enhanced`) |
| Errors | string messages | typed error codes (`AUTH_INVALID`, `PERM_DENIED`, `VALIDATION_ERROR`) — already present in old `get_requirements_enhanced` |
| Validation | server-side `validate_inputs` | zod auto from registry; same rules |
| Versioning | none (v1..v6 path slots) | `/api/v1/...` prefix; registry is versioned by field changes |

**Standard endpoints per resource** (auto): `list`, `get`, `create`, `update`, `delete`, `bulk`, `meta`. **Custom ops** still allowed (old `process_*` custom methods → registered action handlers), but discouraged.

---

## 10. Dynamic Admin Generation Workflow

```
1. Dev defines resource in packages/core (or Prisma model tagged as resource).
2. `generate` codegen runs (pre-build hook):
     • builds zod schemas → backend validation
     • emits TS types + API client → frontend
     • emits OpenAPI → docs
3. Admin app boots:
     • GET /api/meta  → list of accessible resources (filtered by role)
     • For a resource: GET /api/meta/<resource> → full field/UI spec
4. <ResourcePage> renders:
     • Table   (columns from listView.columns)
     • Filters (from filters[] + field types)
     • Form    (field type → input widget; relations → lookups)
     • Detail  (all visible fields)
     • Actions (bulk, custom ops from registry)
5. Save/Delete → same generic API → validation from schema.
```
Result: adding a resource = one declaration. No new admin page, no new controller, no new form code.

---

## 11. Module-by-Module Migration Plan

Legend: **M**=Migrate, **R**=Redesign, **X**=Remove.

### 11.1 Authentication & User Management — M/R
- Users, JWT, roles. Rebuild on the new auth package (§7). Preserve `role_superadmin/role_admin` + granular flags. Tenant scoping required.

### 11.2 Roles & Permissions — M
- `is_permission`/`modules_access` → RBAC in auth package + feature-flag table. Field-level gating preserved via `Field.permissions`.

### 11.3 Backend Administration — R
- Old `panel/network/` (~143 PHP files, recursive) → generic admin renderer (§5.2, §10). Huge code reduction.

### 11.4 Metadata-Driven Framework — M (the priority)
- Rebuild as `packages/core` registry + generic controller + codegen (§4, §8). This is the foundation; build first.

### 11.5 Dynamic Admin Panel — R
- Angular 1.x → Next.js generic renderer. Highest business value.

### 11.6 CMS / Website Management — M
- Blog (`api/packages/blog/*`), notes, articles, pages → resources. Public rendering via `webView` metadata (§8.2).

### 11.7 E-commerce — M
- `api/packages/ecom/*` (product, order, subscription, coupon, inventory, review, cart, wishlist). Products have rich relations (`parent_ecom`, `child_ecom`, `categories`, `tags`) → relations + join tables. Orders/subscriptions → Postgres transactions. Keep payments vendor in `helpers/vendor/payment` logic re-implemented.

### 11.8 E-learning (LMS / Quiz) — M (largest)
- `api/packages/quiz/*` (quiz, quiz_set, topic, notes, liveclass, videolist, exam, attempts, points, comments…). Core domain. Topics are hierarchical (`parentid`) → self-relation tree. Quiz sets have `test_type` (open/cbt) → enum driving different engines. Attempts/answers → ClickHouse (high volume). This is the most complex migration; phase it last.

### 11.9 Public Website — R
- `web/*` PHP → Next.js SSR/ISR (§5.1). Preserve SEO, social cards, design tokens.

### 11.10 API Layer — M/R
- Router + envelope + metadata endpoints → new API service (§4, §9).

### 11.11 Media & File Management — R
- `helpers/imagework`, `imgen`, uploads → object storage (S3/R2) + a `media` resource + signed URLs. Image processing via a small worker.

### 11.12 Settings & Configuration — M
- `get_network_details`/settings JSON → tenant settings table + typed config. `required_settings` gating preserved.

### 11.13 Publisher Panel (SECOND admin surface) — R
- **Not previously captured.** There are TWO admin apps, not one:
  - `panel/network/` = superadmin / network-admin (the 143 pages covered in §11.3).
  - `panel/publisher/` = **content creators / publishers** with their own auth, dashboard, tickets, notices, tokens, invoices, and an `ecom/` sub-panel (cart, orders, wishlist, order detail) — i.e. publishers manage their own storefront + billing.
- Both share the generic renderer (§5.2) but with **different role scopes and nav trees**. The new `ResourcePage` must be multi-tenant-role aware: the same resource can be exposed to `network` (full) vs `publisher` (scoped) with different `scopes`.
- Social login (Facebook/Google) lives in `panel/publisher/auth.php` + `helpers/hybidauth` — see §11.20.

### 11.14 Contacts / CRM & Email Marketing — M (NEW module, was omitted)
- `api/packages/contacts/*` is a full **CRM + email-marketing subsystem** (12 files):
  - `contact` data, `list` (audience segments), `tag`, `camp` (campaigns), `template` (email templates), `email` (outbound), `recieved_email` (inbound, with `reply`), `link` (click tracking), `website`, `smtp` (SMTP config), `cron`.
- Maps to new resources: `Contact`, `ContactList`, `ContactTag`, `Campaign`, `EmailTemplate`, `EmailMessage`, `ReceivedEmail`, `SmtpConfig`, `LinkClick`.
- This is **not** just "notifications" — it is a standalone marketing/CRM module. Promote it from §11.13 (notifications) to its own first-class module.

### 11.15 Email Ingestion (IMAP) — M/R (NEW)
- `jobs/mail/email_cron_job.php` polls IMAP mailboxes (`imap_open`) and writes to `recieved_emails`. This is inbound email ingestion feeding the CRM.
- New: an IMAP polling **worker** (BullMQ/Inngest) + `ReceivedEmail` resource. Keep the IMAP integration; replace the raw `jobs/mail/*` scripts (many `_bkp`/`_old` copies) with one clean worker.

### 11.16 Media / Image Generation Service (`imgen`) — R (expanded)
- `imgen/` is not just storage — it is a **dynamic image service**: `resize_crop_image`, `cropper.php`, `render.php`, OG/social image rendering, fallback images. Used for on-the-fly thumbnails and share cards.
- New: object storage for originals + a small image-service (or CDN + serverless image resize) for dynamic crops/OG images. Keep the cropper UI in admin (media resource upload + crop).

### 11.17 Events / Webinars — M (NEW)
- `api/packages/network/event.php` + `web/event_*.php` + `panel/network/events.php` = events/webinars with tickets (`event_ticket`, `event_confirm`).
- New: `Event` + `EventTicket` resources; public event pages (SSR) + admin management.

### 11.18 Network-Level Admin Resources — M (enumerate, was summarized)
- `api/packages/network/*` (32 files) includes admin-only resources beyond the obvious:
  `event`, `subscriber`, `emailtemp` (email templates, overlaps contacts), `token` (API tokens), `ticket` (support), `staff`, `notice`, `publisher` (publisher accounts), `domain` (tenant domains), `module` (feature modules), `invoice` (platform billing), `systemtag`, `fact`/`summary`/`raw` (analytics exports), `create_module`.
- These become ordinary registered resources (most are simple CRUD), rendered by the generic admin. `fact/summary/raw` are analytics read-views → source from ClickHouse logs.

### 11.19 Content Spin / Thesaurus Helper — M (utility)
- `helpers/spin/spinFunctions.php` = thesaurus/spin-text used for content variation (SEO/desc generation). Keep as a small service/util, not a resource. Low priority.

### 11.20 Social Login — M (NEW)
- Facebook + Google login configured per-publisher/network in `panel/publisher/auth.php` + `helpers/hybidauth` (HybridAuth). New: OAuth providers (NextAuth/Auth.js or Lucia) with the same provider config stored in tenant settings.

### 11.21 Scheduled Jobs / Cron — R (expanded)
- `cron/*.php` (17 jobs): `cron_send_email`, `cron_order_expiry`, `cron_tag_ecom_users`, `cron_user_buyer_*`, `cron_activity_time`, `cron_process_log` (log → ClickHouse), `cron_deleteoldlogs`, `cron_remove_reported_quiz`, `cron_fix_users`, `cron_user_interest`, `cron_order_abandon`, etc.
- New: each cron → a registered **job/worker** (BullMQ/Inngest) with schedules. `cron_process_log` → ships logs to ClickHouse (honors ADR-005). Keep business logic, drop the PHP-script form.

### 11.22 Notifications & Messaging — M
- Email/SMS/push dispatch + templates. **Note:** outbound email templates/campaigns now live in the
  Contacts/CRM module (§11.14); this section covers the **dispatch service** only: `cron/send_email`,
  `send_messages`, SMS/push adapters, and the `cron/emailmessages/*` template library.
- New: a `NotificationService` (provider-agnostic: SMTP/SES, SMS, push) + template store, fed by both
  the CRM campaigns and system events (order confirmations, quiz results). Activity logs → ClickHouse
  (honors ADR-005).

---

## 12. Features to Remove (confirmed)

Per brief + repo scan:

| Path | Reason |
|---|---|
| `/lps/` (544K) | Legacy/experimental landing pages |
| `/math-fast-trick_old/` (2.4M) | Old/duplicate module |
| `/t/` (160K) | Email tracking scripts (also in `.htaccess` rewrite rules — remove those) |
| `/telebot/` (280K) | Telegram bot, out of scope |
| `/tools/` (968K) | Utility scrap — not core |
| `/utils/` (116K) | Misc legacy |
| Scraping modules (`helpers/scrape/`, `api/packages/.../scrape*`) | Out of product scope; security risk |
| Experimental / `_`-prefixed packages | Per discovery.php skip rule |
| Deprecated `bkp`/`old`/`discarded` dirs (`api/packages/discarded/*`, `web/bkp`, `*.backup`) | Dead code |
| AngularJS 1.x panel runtime | EOL; replaced by §5.2 |
| `clearcache.php`, `clearsession.php`, `demo.php`, `health_check.php` | Dev toys (keep a real health endpoint) |
| `jobs/mail/*_bkp*.php`, `jobs/*_old*.php`, `job` display_tables_old* | Redundant job copies; one clean worker each (§11.15, §11.21) |
| `helpers/scrape/`, `*scrape*` packages | Scraping — out of scope (security risk) |
| `helpers/hybidauth/libs` vendor bloat | Replaced by modern OAuth lib (§11.20) |

> Note: old code is large but low-value. Do **not** port it. Keep a `legacy/` archive read-only if audit trail needed, but exclude from build.

---

## 13. Features to Improve

1. **Complete admin automation** (§1.5, §5.2) — the biggest win.
2. **Type safety end-to-end** — codegen from one schema (§8.2.2).
3. **Real relations** instead of ID strings + `tag_builder` (§6, §8.2.3).
4. **Separation of concerns** — kill `$GLOBALS` shared state; use DI/context.
5. **SSG/ISR for SEO** — old site is PHP-rendered; formalize render strategy (§5.1).
6. **DB correctness** — drop append-only ClickHouse-as-OLTP; use Postgres for CRUD (§6.3).
7. **Media off DB/repo** → object storage (§11.11).
8. **Observability** — replace ad-hoc `mylog()` with structured logging + the existing activity/apilog tables fed by a proper logger.
9. **API docs** — already auto-generated conceptually; keep it, power by registry (§8.2).
10. **Security hardening** — centralized validation (no scattered `preg_match`), parameterized queries everywhere, CSP, signed uploads.

---

## 14. Recommended Technology Stack

### 14.1 Default: Next.js — with a refinement
Next.js (App Router) is a sound default for the **public site + admin** (one framework, SSR/ISR/CSR unified, great SEO). But the API layer benefits from explicit server structure.

**Two viable shapes:**

**Option A — Single Next.js monolith** (recommended for fastest delivery):
- `apps/web` and `apps/admin` are Next apps; API is Next Route Handlers under `app/api`.
- Metadata engine + registry in `packages/core`; admin generic renderer in `packages/ui-admin`.
- Pros: one deploy, one language, simplest ops. Cons: API less "standalone."

**Option B — Next.js frontends + separate NestJS API**:
- `apps/api` = NestJS (modules/guards/pipes map cleanly to old `api_access_check`/`validate_inputs`/`boot`).
- Pros: clean API boundary, scales independently, familiar REST structure. Cons: two runtimes.

**Recommendation:** **Option A** to start (lower complexity, satisfies "don't make it significantly more complex"), with the API isolated enough (route handlers + a `packages/core` engine) that it can be extracted to NestJS later if needed. The metadata engine is framework-agnostic, so the choice is reversible.

### 14.2 Why not stay on PHP / why this stack
- The value is the *metadata model*, not PHP. PHP/Laravel could preserve it, but: panel needs a modern SPA (AngularJS 1.x is dead), public site needs first-class SSR/ISR (PHP works but Next is purpose-built), and TypeScript codegen from schema is far stronger in the JS ecosystem.
- If the team is PHP-strong and wants minimal retraining, **Laravel + Filament** is a credible alternative (Filament is itself a metadata-driven admin). Trade-off: weaker public-site SSR story and weaker codegen than Next. Documented as ADR-004 alternative.

### 14.3 Data
- **Postgres** (Prisma) primary. **ClickHouse** analytics only. **Redis** cache/sessions. **Object storage** media. **BullMQ/Inngest** jobs.

### 14.4 Adjacent
- Auth: `@node-jsonwebtoken` (HS256 compat) or `jose`. Validation: `zod`. UI: Tailwind + Radix/shadcn. ORM: Prisma. Docs: OpenAPI + Scalar/Redoc.

---

## 15. Implementation Roadmap (phases)

> Build the metadata engine **first**; everything else hangs off it.

**Phase 0 — Foundations — ✅ COMPLETE (verified, 2026-07-19)**
- Monorepo scaffold (pnpm workspaces) at `/home/neo/projects/lakshyanew`.
- `packages/core` metadata engine: `defineResource`, `ResourceRegistry`, per-op field
  derivation (`metaForResource`), list-view meta, admin meta, zod validation (CREATE strict /
  UPDATE partial). 5 unit tests pass.
- `apps/api` (Fastify): Prisma schema v1 (Tenant/User/Topic, tenant-scoped per ADR-002), JWT HS256
  auth + RBAC, generic CRUD controller, `GET /api/meta` + `GET /api/meta/:resource`. 12 integration
  tests pass against Docker Postgres. See `docs/PROGRESS.md`.
- **Admin `ResourcePage` generic renderer deferred to Phase 1** (the API + metadata endpoints are
  ready to drive it; no per-resource admin pages exist yet in the new system, which is the goal).

**Phase 1 — Metadata loop closed — ✅ COMPLETE (verified, 2026-07-19)**
- `packages/codegen`: `generateAll()` emits zod schemas, TS types, OpenAPI 3 spec, and a typed
  fetch client from the registry. `pnpm generate` writes real artifacts for all registered
  resources (Topic, BlogPost, User, Tenant). 5 unit tests pass.
- `packages/ui-admin`: `buildView(meta)` pure view-model builder + generic `ResourcePage` React
  component + admin fetch client. 4 unit + 3 integration tests pass against live API/Postgres.
- Blog resource added end-to-end (Prisma model + resource def + 6 API integration tests) — proving
  a second, differently-shaped resource needs NO new admin/API code, only a `defineResource` call.
- **35/35 tests pass** (`pnpm test`, exit 0). See `docs/PROGRESS.md`.
- Deferred: admin sidebar/nav shell (lands in Phase 2 hardening); public SSR; publisher surface;
  ClickHouse logs (ADR-005).

**Phase 2 — Admin surfaces, nav & ClickHouse logs — ✅ COMPLETE (verified, 2026-07-20)**
- Registry-driven navigation (`packages/core/src/nav.ts`): `buildNav`/`accessibleResources`
  derive the sidebar + role filtering from resource `scopes` + `group`/`icon`. Verified by
  5 unit tests (network/publisher/perm-gating).
- Served admin app (`apps/admin`): SSR Fastify server rendering sidebar + table + create/edit
  forms from `/api/meta/*` — no per-resource templates. 4 integration tests pass over HTTP.
- `GET /api/meta/nav` (new) + role-filtered `GET /api/meta`.
- ClickHouse logs sink (`packages/logger`): buffered, never-throws, re-buffers on failure,
  live-tested against a real ClickHouse 24 container (insert + read-back verified). ADR-005.
- **48/48 tests pass** (`pnpm test`, exit 0). See `docs/PROGRESS.md`.
- Deferred: **MariaDB→Postgres ETL** — no MariaDB source present in this environment; target
  schema/tenant model are ready to receive it. Also deferred: publisher UI surface, CRM,
  e-commerce, events, public SSR, bulk actions.

**Phase 3 — E-commerce domain + relation support — ✅ COMPLETE (verified, 2026-07-20)**
- Prisma `Category` + `Product` (Product.categoryId FK → Category); migration `add_ecommerce`
  applied, client regenerated.
- `Category`/`Product` resource definitions with `relation` fields (`{ resource, labelField }`),
  grouped under `E-commerce` nav section.
- Served admin renders `relation` fields as populated `<select>`s (fetches target resource).
- Codegen regenerated for 6 resources (client/OpenAPI/types include e-commerce).
- **55/55 tests pass** (`pnpm test`, exit 0). See `docs/PROGRESS.md`.
- Deferred in this phase: orders, cart, coupons, subscriptions, reviews, Users/Roles hardening,
  Media, publisher surface, CRM, public SSR, MariaDB ETL.

**Phase 4 — Users, Roles & SOM permissions — ✅ COMPLETE (verified, 2026-07-20)**
- SOM (Scoped Object Model) engine in `@lakshya/core` (`can`/`scopeFor`/`effectiveSoms`);
  master `MODULES_ACCESS` config; `Role` + `UserRole` + `User.roles` JSON; `requireSom`
  enforced on every CRUD route with row-scope (global/tenant/self) filtering. ADR-007.
- **64/64 tests pass** (`pnpm test`, exit 0). See `docs/PROGRESS.md`.
- Deferred: Role SOM editor UI (`self` scope needs `createdBy`); e-commerce remainder,
  Media, publisher surface, CRM, public SSR, MariaDB ETL.

**Phase 5 — Orders + OrderItems (relational e-commerce) — ✅ COMPLETE (verified, 2026-07-20)**
- Prisma `Order` (userId→User) + `OrderItem` (orderId→Order cascade, productId→Product),
  back-relations added; `Order`/`OrderItem` resources with relation fields; SOM entries added.
- Generic admin renders the FK relations; `filters` by orderId gives one-to-many drill-down.
- **70/70 tests pass** (`pnpm test`, exit 0). See `docs/PROGRESS.md`.
- Deferred: cart, coupons, subscriptions, reviews, auto-compute total; Media, CRM, public SSR, MariaDB ETL.

**Phase 6 — Two admin surfaces (publisher-scoped) — ✅ COMPLETE (verified, 2026-07-20)**
- Surface-aware `buildApp(opts)` in `apps/admin`; `apps/admin-publisher` reuses it with a
  publisher token + `/panel/publisher` basePath (one renderer, two nav trees; §11.13).
- `User`/`Role` hardened to network-only; publisher surface hides them; API returns 403 to
  publisher on network-only resources. **76/76 tests pass** (`pnpm test`, exit 0).
- Deferred: richer publisher UX; cart, coupons, subscriptions, reviews; Media, CRM, public
  SSR, MariaDB ETL.

**Phase 7 — Media & File Management — ✅ COMPLETE (verified, 2026-07-20)**
- `Media` Prisma model + `Media` resource (with `media` field type); `POST /api/media/upload`
  writes to disk + creates a row; `GET /media/:file` serves files; `cover` media field added
  to `Product`; admin renders media as file input. SOM-gated. **82/82 tests pass**; build green.
- Deferred: `imgen` image service (resize/transform); cart/coupons/subscriptions/reviews; CRM;
  public SSR; MariaDB ETL.

**Phase 8 — Public website SSR (webView metadata) — ✅ COMPLETE (verified, 2026-07-20)**
- `apps/web` SSR renderer: resources with `webView.{landing,slugField,detail}` get server-rendered
  listing + detail pages (SEO-friendly) with zero per-resource view code. Added `webView.publicStatus`
  (BlogPost=`published`, default `active`) so drafts are hidden. **85/85 tests pass**; build green.
- Deferred: Next.js App Router production web (ISR/SSG), `imgen`, cart/coupons/subscriptions/
  reviews, richer publisher surface, CRM, MariaDB ETL.

**Phase 9 — Reviews (e-commerce UGC) — ✅ COMPLETE (verified, 2026-07-20)**
- `Review` Prisma model + `Review` resource (FKs to Product + User, rating + moderation
  `status` enum) + SOM entries; generic admin renders FKs; filters by productId/status.
  **90/90 tests pass**; build green. Codegen at 11 resources.
- Deferred: cart, coupons, subscriptions; `imgen`; Next.js production web; richer publisher
  surface; CRM; MariaDB ETL.

**Phase 10 — Cart + CartItem — ✅ COMPLETE (verified, 2026-07-20)**
- `Cart` + `CartItem` Prisma models + resources (nested one-to-many: cart → cartitem → product)
  + SOM entries; generic admin renders FKs. **95/95 tests pass**; build green. Codegen at 13 resources.
- Deferred: coupons, subscriptions; `imgen`; Next.js production web; richer publisher surface; CRM; MariaDB ETL.

**Phase 11 — Coupons — ✅ COMPLETE (verified, 2026-07-20)**
- `Coupon` Prisma model + `Coupon` resource (percent/fixed, caps, validity window) + SOM entries.
  Generic admin renders enums. Added P2002→409 catch in `createResource` (benefits all unique
  keys). **99/99 tests pass**; build green. Codegen at 14 resources.
- Deferred: subscriptions; `imgen`; Next.js production web; richer publisher surface; CRM; MariaDB ETL.

**Phase 12 — Subscriptions — ✅ COMPLETE (verified, 2026-07-20)**
- `Subscription` Prisma model + `Subscription` resource (FK to User, status/interval enums)
  + SOM entries. Full e-commerce domain now complete (Category/Product/Cart/CartItem/Order/
  OrderItem/Review/Coupon/Subscription). **102/102 tests pass**; build green. Codegen at 15 resources.
- Deferred: `imgen`; Next.js production web; richer publisher surface; CRM; MariaDB ETL.

**Phase 13 — CRM: Contacts — ✅ COMPLETE (verified, 2026-07-20)**
- `Contact` Prisma model + `Contact` resource in a new `CRM` nav group (owner FK, status enum,
  tags) + SOM entries. Proves new nav groups appear automatically. **106/106 tests pass**;
  build green. Codegen at 16 resources.
- Deferred: CRM email/IMAP send; `imgen`; Next.js production web; richer publisher surface; MariaDB ETL.

**Phase 14 — imgen: Media variants — ✅ COMPLETE (verified, 2026-07-20)**
- `MediaVariant` Prisma model + `imgen` engine (sharp: 200px webp thumbnail auto on image upload)
  + `/media/variant/:file` serve route + `MediaVariant` resource (Media group) + SOM entries.
  **109/109 tests pass**; build green (slow first build due to sharp native). Codegen at 17 resources.
- Deferred: on-demand variant params (`?w=&f=`); Next.js production web; CRM email/IMAP send; MariaDB ETL.

**Phase 15 — Settings & Configuration — ✅ COMPLETE (verified, 2026-07-20)**
- `Setting` Prisma model + `Setting` resource (key/value JSON, group) in a new `Settings` nav
  group + SOM entries. JSON values round-trip; duplicate key → 409. **113/113 tests pass**; build green.
  Codegen at 18 resources.
- Deferred: `imgen` on-demand params; Next.js production web; CRM email/IMAP send; MariaDB ETL.

**Phase 16 — imgen on-demand variants — ✅ COMPLETE (verified, 2026-07-20)**
- `GET /media/:id/variant?w=&h=&f=` generates (sharp) + caches (MediaVariant, signature WxH-FMT)
  webp/avif/png/jpeg variants; repeat request cache-hits (no new row). No schema change.
  **117/117 tests pass**; build green.
- Deferred: Next.js production web; richer publisher surface; CRM email/IMAP send; MariaDB ETL.

**Phase 17 — Next.js SSR/SSG/ISR storefront — ✅ COMPLETE (verified, 2026-07-20)**
- Public read layer in API (`/api/public/:resource` + `/:key`, tenant-scoped, webView.publicStatus
  filter, no auth, non-public → 403). `apps/webstore` Next.js 14 App Router: home **SSR**, blog
  index **SSG**, blog detail **ISR** (`generateStaticParams` + `revalidate=60`). Live `curl` smoke
  confirmed all 3 return 200 with rendered content. **119/119 tests pass**; `pnpm -r build` green
  (9 pkgs, webstore build needs API up).
- Deferred: richer publisher surface; CRM email/IMAP send; MariaDB ETL; product/collection pages.

**Phase 18 — E-commerce public pages (SSR/SSG/ISR) — ✅ COMPLETE (verified, 2026-07-20)**
- Storefront gained `/products` (SSG), `/products/[slug]` (ISR), `/collections/[slug]` (ISR) using
  the Phase 17 public-read layer — **no backend change** (product/category already had `webView`).
  Live smoke: all 3 return 200 with rendered content. **122/122 tests pass**; build green (9 pkgs).
- Deferred: richer publisher surface; CRM email/IMAP send; MariaDB ETL; cart/checkout public flow.

**Phase 19 — Guest cart & checkout start — ✅ COMPLETE (verified, 2026-07-20)**
- Guest cart API (`/api/guest-cart*`, no auth, price snapshot, reuse Cart/CartItem models) + storefront
  proxy routes + SSR `/cart` + `AddToCart` button. Live smoke proved full flow (create→add→SSR cart).
  **123/123 tests pass** (1 skipped cart-flow); build green (9 pkgs).
- Deferred: checkout/payment (cart→Order); richer publisher surface; CRM email/IMAP send; MariaDB ETL.

**Phase 20 — Guest checkout (cart → Order) — ✅ COMPLETE (verified, 2026-07-20)**
- Checkout API (`POST /api/guest-cart/:id/checkout`, no auth) snapshots cart → Order (total,
  `pending`) + marks cart `converted`; rejects empty cart (422). Storefront SSR `/checkout` +
  `PlaceOrder` + proxy. Live smoke: full flow → order `pending`, total 998. **126/126 pass** (2
  skipped); build green (9 pkgs).
- Deferred: real payment gateway → `paid`; richer publisher surface; CRM email/IMAP send; MariaDB ETL.

**Phase 21 — Payment + security/observability — ✅ COMPLETE (verified, 2026-07-20)**
- Payment abstraction (`apps/api/src/payments.ts`, ADR-008): `POST /api/orders/:id/pay` flips
  `pending→paid` via a swappable gateway (mock default; real gateway fail-closed until configured).
  `Order.paymentRef`/`paidAt` added. Storefront `PlaceOrder` places **and pays**. Security/
  observability pass: request-id, structured `api_request` logs → ClickHouse, security headers.
  **129/129 pass** (3 skipped); build green (9 pkgs).
- Deferred to Phase 22 (external deps): real gateway webhook, CRM email/IMAP, MariaDB ETL, load test,
  DNS cutover. **In-repo platform is feature-complete.**

**Phase 22 — Production readiness (deferred, external deps)**
- Real payment gateway + webhook reconciliation; CRM email/IMAP; MariaDB→Postgres ETL (needs source).
- Load test + observability dashboards; DNS cutover; decommission legacy PHP behind read-only adapter.
- Final docs review (API ref, runbooks).

---

## 16. Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Schema reverse-engineering misses fields | Data loss | Extract field list from all `dimensions()` programmatically; diff against ClickHouse DDL; checksum row counts post-ETL |
| ClickHouse append-only → Postgres update semantics | Removed risk | ClickHouse no longer holds CRUD data (ADR-005); only logs. CRUD migrates MariaDB→Postgres with normal updates |
| JWT incompat during cutover | Login break | Reuse same HS256 secret; dual-token window; parity tests |
| `$GLOBALS` state assumptions | Bugs | Explicit context objects; contract tests on API behavior |
| Admin generic renderer can't express quiz/ranking UI | UX regression | `viewConfig` overrides for exceptional resources (§8.2.5) |
| `tag_builder`/JSON-blob relations lose fidelity | Data corruption | ETL expands blobs → join tables; validate counts |
| Multi-tenant leak | Security | Tenant middleware + tests; `tenant_id` on every table |
| AngularJS→React rewrite scope | Schedule | Generic renderer eliminates 143 pages; only exceptions custom |
| Media 335MB in repo | Bloat | Object storage; migrate references, not files |
| Old code quality (dead `bkp`/commented blocks) | Confusion | Exclude legacy/ from build; don't port |
| Undocumented business rules in 10k-line files (e.g. topic.php 2969 lines) | Missed logic | Per-module subagent deep-read + behavior tests before porting |
| Verification gap (old rules require real testing) | False completion | Adopt same Mandatory Verification rule: API via real requests, admin via browser, public via crawl |

---

## 17. Documentation Plan (first-class, in `docs/`)

- `docs/MIGRATION_PLAN.md` — this file.
- `docs/adr/` — ADR-001 (API framework), ADR-002 (tenancy), ADR-003 (response envelope), ADR-004 (PHP/Laravel alt), ADR-005 (DB: ClickHouse retention), ADR-006 (render strategy), ADR-007 (SOM permissions), ADR-008 (payment abstraction).
- `docs/architecture.md` — system diagram, data flow, metadata loop.
- `docs/modules/*.md` — one per module (purpose, migrate/redesign/remove, deps, improvements).
- `docs/api/` — OpenAPI (generated) + endpoint catalog.
- `docs/db/schema.md` — Prisma schema narrative + ETL map.
- `docs/guides/` — setup, dev, deploy, coding-standards, migration-progress.
- **Rule:** every architectural/implementation change updates the relevant doc + ADR before merge. CI can lint doc freshness.

---

## 18. Next Steps (explicit)

1. Confirm stack decision (§14) → write ADR-001/004.
2. Approve Phase 0 scope & Prisma schema v1 draft.
3. Begin Phase 0: scaffold + `packages/core` + Topic end-to-end (proves the loop).
4. Keep this doc + `docs/` updated each phase.

*No code has been written. This document is the agreed plan to implement against.*
