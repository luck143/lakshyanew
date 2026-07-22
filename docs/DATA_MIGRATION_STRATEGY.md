# Data Migration Strategy — ClickHouse (old) → PostgreSQL (new)

**Corrects `MIGRATION_PLAN.md` §1.6 / §6 which wrongly assumed MariaDB is the CRUD store.**
**Status:** Plan (no production script executed). **Date:** 2026-07-20
**Author:** migration agent

---

## 0. CRITICAL PREMISE CORRECTION (read first)

The earlier `MIGRATION_PLAN.md` stated:

> "ClickHouse — primary OLTP for most resources" … "MariaDB — referenced in docker-compose.yml for transactional data" … "ETL reads from MariaDB (the CRUD/transaction store)."

**That is wrong.** Empirical scan of the actual old code (`/home/neo/projects/lakshya`) proves the opposite:

| Evidence | Finding |
|---|---|
| `helpers/api/chouseHandler.php` | Full ClickHouse ORM: `ClickHouseDB\Client`, port **8123**, `visitParamExtractRaw` for JSON columns, retry/caching/server-down handling. |
| `api/config.php` → `chouse_database_details()` | Returns ClickHouse connections for `saas`, `lakshyadb`, `luck`, `logdb`, `ecomdb`, `userdb`, `blogdb`, `gpaadb`. These are the **business data stores**. |
| `api/config.php` → `mysql_database_details()` | Commented `//Mysql BANNED`. Not used by any resource. |
| `grep conn= across api/packages` | **237** resource files use `conn="saas"` (216) or `conn="blogdb"` (21). **0** use MySQL. |

**Conclusion:** In the live old system, **ClickHouse IS the system of record for ALL business data** (users, topics, quizzes, blog, ecom, orders, CRM, network admin). MariaDB is not the source. The new target (per ADR-005 + user direction) remains **PostgreSQL = system of record, ClickHouse = logs only** — but the **ETL source is ClickHouse**, not MariaDB. Any migration script that reads MariaDB will migrate **zero rows**.

This document supersedes §6.3 of `MIGRATION_PLAN.md` on the data-source question.

---

## 1. Resource Inventory — Old (ClickHouse) vs New (Postgres)

### 1.1 Old project: ~96 API resources (ClickHouse-backed), by group

| Group | # | Resources (file stems) |
|---|---|---|
| blog | 10 | category, comment, macro, post, story, tag, user_category, user_macro, user_post, user_tag |
| ecom | 17 | category, coupon_discount, inventory, option, order, product, review, subscription, tags, user_category, user_e_order, user_order, user_product, user_purchase_check, user_review, user_subscription, user_wishList |
| quiz | 27 | ask_question, comment_like, comment, exam, imgen, liveclass, notes, quiz, quiz_set2, quizset_attempt, quiz_set, raise_problem, tag, topic, user_comments, user_exam, user_notes, user_points, user_question_set_points, user_quiz, user_quizset_attempts, user_quizset_batch, user_quizset, user_systemtag, user_topic, user_videolist, videolist |
| quizdb | 2 | quiz, topic |
| quiz_exp | 4 | current_affairs, quiz_exp, topic_buffer, topic_exp |
| network | 17 | auth, create_module, dashboard, domain, emailtemp, event, invoice, module, notice, publisher, send_message, setting, staff, subscriber, systemtag, ticket, token |
| publisher | 9 | auth, default_pub_token, invoice, notice, profile, subscriber, subscriber_profile, ticket, token |
| contacts | 9 | camp, email, link, list, recieved_email, smtp, tag, template, website |
| log | 1 | vid |
| **TOTAL** | **96** | |

Note: `user_*` prefix = **row scope** (current user's rows), not a separate table. After de-duplication of user-scoped mirrors, the distinct *business entities* are ~60.

### 1.2 New project: 18 registered resources (Postgres)

`blogpost, cart, cartitem, category, contact, coupon, media, mediavariant, order, orderitem, product, review, role, setting, subscription, tenant, topic, user`

### 1.3 GAP matrix (what exists in old but NOT yet in new)

| Old entity (group) | New resource? | Action |
|---|---|---|
| topic (quiz) | `topic` ✓ | map fields |
| blog post/category/comment/tag | `blogpost`, `category` ✓ (comment/tag missing) | add `blogcomment`, `blogtag` |
| product/category/order/review/subscription/coupon | ✓ all present | map fields |
| cart / cartitem | ✓ | map |
| contact (CRM) | `contact` ✓ | expand to ContactList/Tag/Campaign/Template/EmailMessage/ReceivedEmail/SmtpConfig/LinkClick (contacts group = 9 entities) |
| quiz / quiz_set / exam / notes / liveclass / videolist / attempts / points | ✗ | **NOT YET MIGRATED** — largest gap (LMS core) |
| network: event, invoice, ticket, notice, staff, domain, module, publisher, subscriber, setting, token, systemtag, send_message, emailtemp, create_module, dashboard | ✗ (only `setting`, `user` partial) | **NOT YET MIGRATED** |
| publisher: profile, subscriber_profile, default_pub_token | ✗ | **NOT YET MIGRATED** |
| media / imgen | `media`, `mediavariant` ✓ | map |
| user / role / tenant | ✓ | map |
| log/vid (activity) | → ClickHouse retained (ADR-005) | no PG migration |

**Bottom line:** The new project currently covers the **CMS + e-commerce + auth + media** slice (~18 resources). The **entire LMS/quiz domain (~30 entities) and the network/publisher admin domain (~25 entities) are NOT yet defined** and must be added (API-first) before their data can be migrated. This matches the user instruction: "recreate all resource APIs … only after the APIs are complete should data migration begin."

---

## 2. API-First Sequencing (per user instruction)

1. **Define resources** in `packages/core` + `apps/api/src/resources.ts` for every old entity that must survive (see §1.3 gap). One declaration → auto API + admin UI + TS types.
2. **Expose standardized endpoints** (generic CRUD from `crud.ts`): `GET/POST /api/<res>`, `GET/PATCH/DELETE /api/<res>/:id`, `POST /api/<res>/bulk`, `GET /api/meta/<res>`.
3. **Verify each resource** with integration tests (existing `crud.test.ts` pattern) against empty Postgres.
4. **Only then** run the ETL (§4) for that resource.

Do NOT write migration scripts that target resources not yet defined — they would have nowhere to land.

---

## 3. Target Schema & JSON Normalization Strategy

ClickHouse stores rows as wide columns; many "columns" are actually **JSON strings** queried via `visitParamExtractRaw`. The new Postgres schema must decide, per field, JSON vs normalized.

### 3.1 General rules

| Old shape | New shape | Rationale |
|---|---|---|
| Scalar column (`String`/`Int`/`Float`/`Date`) | Native PG column (text/int/numeric/timestamptz) | Type-safe, indexable |
| JSON object used as a **fixed sub-record** (e.g. `extra{displayads,layout}`) | **Flatten to columns** OR a typed `jsonb` if truly open | Queryable; avoid `->>` everywhere |
| JSON array of scalars (e.g. `tags[]`, `child_ecom[]`) | **Junction table** (`resource_tag`, `product_related`) OR `text[]`/`jsonb` if append-only | Relations need FKs for integrity |
| JSON array of objects (e.g. quiz questions, order items) | **Child table** with FK | Normalized, updatable |
| Free-form settings blob (`setting.value`) | `jsonb` + typed accessor | Open config is legitimate JSON |
| `user_*` scope marker | `createdBy`/`ownerId` column + RLS/tenant filter | Replace prefix convention |

### 3.2 Per-resource JSON transformation (COMPLETE — every JSON-bearing resource)

The table below is derived directly from the implemented migration specs
(`scripts/migrate/specs.ts`) and Prisma models. It supersedes the earlier
"representative" notes. Decision rule: **arrays of scalars → `text[]`**;
**structured/heterogeneous blobs → `jsonb`**; **relational lists that need FK
integrity → child table** (only `order/orderitem`, `cart/cartitem`,
`quiz/quizcomment`, `topic/category/exam/module/ticket` self-relations). No
separate junction tables were needed — `text[]` + `jsonb` cover the legacy
array/object payloads while keeping the API functionally identical.

| Old resource | Old JSON column(s) | New field(s) | Decision |
|---|---|---|---|
| product | `categories`, `images`, `tags` | `categories jsonb`, `images jsonb`, `tags text[]` | arrays → jsonb/text[] (append-only, no FK integrity needed) |
| quiz | `extra` (question/answer/solution) | `question text`, `answer jsonb`, `correctAns text`, `solution text`, `marks int`, `extra jsonb` | **PROMOTED** question/answer/solution/correct_ans/marks to first-class columns; rest of `extra` → `jsonb` |
| blogpost | `tags` | `tags text[]` | array of scalars → text[] |
| exam | `exam_type`, `exam_group`, `seo_group` | `examType/examGroup/seoGroup text[]` | arrays → text[] |
| order | `extra`, `payment_details` | `extra jsonb`, `paymentRef text` | blob → jsonb; payment ref scalar |
| cart | `extra` | `extra jsonb` | blob → jsonb |
| liveclass | `tags`, `recordings` | `tags text[]`, `recordings jsonb` | scalars → text[]; object list → jsonb |
| videolist | `mirrors`, `ecom_plan` | `mirrors jsonb`, `ecomPlan jsonb` | blobs → jsonb |
| contact | `extra`, `message` | `extra jsonb`, `notes text` | blob → jsonb; message → notes |
| user | `extra` (+ profile cols phone/city/…) | `extra jsonb` | profile cols folded into `extra` jsonb (User model is minimal) |
| role | `permissions`, `module_permissions` | `soms jsonb` | permission codes + module perms folded into SOM triples |
| setting | `content` (per-row config blob) | `value jsonb` | arbitrary config → jsonb + typed `getSetting()` |
| invoice | `payment`, `extra` | `payment jsonb`, `extra jsonb` | blobs → jsonb |
| ticket | `uploads` | `uploads jsonb` | blob → jsonb |
| staff | `payment`, `permissions` | `payment jsonb`, `permissions jsonb` | blobs → jsonb |
| subscriber | `extra` | `extra jsonb` | blob → jsonb |
| event | `tags` | `tags text[]` | scalars → text[] |
| notice | `extra` | `extra jsonb` | blob → jsonb |
| publisherprofile | `payment` | `payment jsonb` | blob → jsonb |
| publishertoken | `apps`, `domains`, `ips` | `apps/domains/ips jsonb` | access-control lists → jsonb |
| successstory | `tags` | `tags text[]` | scalars → text[] |

**Relational (non-JSON) normalization that the ETL performs:** `order.items` →
`orderitem` child table (FK orderId); `cart` → `cartitem` child table (FK
cartId); `quiz.comments` → `quizcomment` (FK qid); self-relations `topic`/
`category`/`exam`/`module`/`ticket` via `parentId` remapped by `legacyId`.

**Principle:** normalize anything you JOIN or enforce FK on; keep `jsonb`/`text[]`
for genuinely open/schemaless or append-only payloads (tags, media lists, config
blobs, access lists). The **API exposes the same functionality** — `fields` +
`webView` reconstruct the legacy shape on read, so clients see no behavioral
change during cutover. The full-pipeline proof (`scripts/migrate/verify-local.ts`)
migrates all 22 JSON-bearing resources and asserts normalization + idempotency.


## 4. ETL / Migration Scripts (read-only, idempotent, validated, incremental)

### 4.1 Hard safety constraints (NON-NEGOTIABLE)

1. **Old DB is READ-ONLY.** Scripts use a ClickHouse user with `readonly=1` (the old `chouseHandler` already supports a `readonly` client flag). **No `INSERT/UPDATE/DELETE/OPTIMIZE` ever issued against old ClickHouse.**
2. **Never modify or delete production data.** Scripts are pure `SELECT`. A dry-run mode (`--dry-run`) issues zero writes to either side and only prints row counts + samples.
3. **Idempotent.** Each row keyed by a **stable natural/business key** (old `id` UUID or `slug`+tenant). Re-run = upsert (`ON CONFLICT (legacyId, tenantId) DO UPDATE`), never duplicate. A `_mig` mapping table records `legacyId → newId` per resource so FK remaps work across runs.
4. **Validated.** After each batch: row-count reconciliation (`old_count == new_count`), FK integrity check, non-null required fields, sample diff. Report inconsistencies to a `migration_report` table + stdout; **fail loudly**, never silently.
5. **Incremental.** Support `--since <timestamp>` to migrate only rows newer than last run (uses ClickHouse `updated_at`/`created_at`). Resumable via the `_mig` table.
6. **Tenant-scoped.** Every query filtered by `tenantId`/`network` so a bad run can't cross-contaminate tenants.
7. **No production creds in repo.** Connection strings come from env (`OLD_CHOUSE_URL`, `NEW_PG_URL`); `.env` is git-ignored (defense-in-depth).

### 4.2 Script layout (`scripts/migrate/`)

```
scripts/migrate/
  cli.ts                # commander: run <resource> [--dry-run] [--since ISO] [--batch N]
  lib/clickhouse.ts     # readonly CH client (readonly=1), SELECT-only guard
  lib/pg.ts             # pg client + upsert helper (ON CONFLICT)
  lib/map.ts            # _mig mapping table (legacyId<->newId) + FK resolver
  lib/validate.ts       # reconciliation + report
  resources/            # one adapter per migrated resource
    product.ts  blogpost.ts  topic.ts  user.ts  order.ts  contact.ts ...
  transforms/json.ts    # JSON->relational helpers (tags[], child_ecom, questions[])
```

Each `resources/<name>.ts` exports:
- `extract(ch, tenant, since)` → yields old rows (SELECT, batched `LIMIT/OFFSET` or `WHERE updated_at > since`)
- `transform(row, map)` → new rows + child rows (normalizes JSON per §3.2)
- `load(pg, rows)` → upsert into PG (+ child tables), records `_mig`

### 4.3 Run order (dependency-aware)

1. `tenant` (networks/domains) — needed for tenantId on everything.
2. `role`, `user` (FK to tenant; permissions jsonb).
3. `category`, `topic` (self-relation within topic).
4. `blogpost`, `blogcomment`, `blogtag`.
5. `product`, `product_related`, `review`, `coupon`, `subscription`, `inventory`, `media`, `mediavariant`.
6. `cart`, `cartitem`, `order`, `orderitem`.
7. `contact` + CRM children (list, tag, campaign, template, email, received_email, smtp, link).
8. `quiz`/`quiz_set`/`exam`/`notes`/`attempts` (LMS — after those resources exist).
9. network/publisher admin entities last (low blast radius).

### 4.4 Validation report (example)

```
[product] tenant=default dry-run=false
  old: 10  new_before: 0  new_after: 10  diff: 0   OK
  FK: categoryId 10/10 resolved   OK
  JSON: tags[] -> 10 rows in product_tag   OK
  sample mismatch: 0
[order] ...
  old: 3  new_after: 3  FK orderitem: 3/3   OK
REPORT: 13/13 resources reconciled. 0 inconsistencies.
```

---

## 5. JSON Normalization — concrete before/after (product)

Old ClickHouse row (conceptual):
```json
{ "id":"uuid", "title":"Async JS", "tags":"['javascript','async']",
  "child_ecom":"['id2','id5']", "parent_ecom":"", "extra":"{\"displayads\":\"active\"}",
  "price":499, "status":"active", "tenant":"default" }
```
New Postgres:
```
product(id, title, price, status, tenantId, extra_displayads, ...)
product_tag(productId, tag)            -- 'javascript','async'
product_related(fromId, toId)         -- self-relation (id2, id5)
```
API read reconstructs legacy `{tags:[...], child_ecom:[...], extra:{...}}` from the normalized tables so old clients keep working during cutover.

---

## 6. Open questions for user sign-off

1. **LMS scope:** quiz/attempts volume may be large. Keep attempts in PG (simpler) or stream to ClickHouse (ADR-005) and only migrate recent? Recommend: migrate all to PG for fidelity; archive >12mo to CH later.
2. **`user_*` de-duplication:** old has both `quiz` and `quizdb` topic/quiz (likely legacy+current). Migrate `quizdb` only, or both with a `source` column? Recommend `quizdb` = canonical, `quiz` = legacy (flag, don't overwrite).
3. **Media blobs:** old `assets/`/`imgen/` are files, not DB. Migrate DB rows; copy files to object storage (R2/S3) out-of-band (not in this ETL).
4. **Cutover:** per-module (topics→blog→ecom→quiz→network) with shadow-read diff, as in MIGRATION_PLAN §6.3 step 4.

---

## 7. What is NOT migrated (by design)
- ClickHouse **log/event** tables (`vid`, activity, api logs, answer logs) → **stay in ClickHouse** (ADR-005). No PG copy.
- Removed modules (`/lps`, `/telebot`, `/tools`, scrape, `_bkp`/`_old`/`discarded`) → no data migration.
