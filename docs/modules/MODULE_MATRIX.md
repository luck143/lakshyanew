# Module Migration Matrix (v2 — corrected after second review)

Quick reference for all modules. Full notes in `MIGRATION_PLAN.md` §11. Legend: **M**=Migrate, **R**=Redesign, **X**=Remove.

| # | Module | Decision | Old code | Notes |
|---|---|---|---|---|
| 1 | Auth & User Mgmt | M/R | `publisher/auth*`, `network/auth`, `saasApiHandler` | JWT HS256 compat; user + tenant |
| 2 | Roles & Permissions | M | `apiHandler.is_permission/modules_access` | RBAC + feature flags |
| 3 | Backend Admin — Network | R | `panel/network/*.php` (143) | → generic renderer |
| 3b | Backend Admin — Publisher | R | `panel/publisher/*` | SECOND surface; scoped storefront/billing (§11.13) |
| 4 | Metadata-Driven Framework | M (priority) | `apiCore`, `validationHandler` | → `packages/core` + codegen |
| 5 | Dynamic Admin Panel | R | `panel/*` AngularJS 1.x | → Next.js generic `ResourcePage` (role-aware) |
| 6 | CMS / Website Mgmt | M | `api/packages/blog`, `notes`, `web/*` | resources + `webView` |
| 7 | E-commerce | M | `api/packages/ecom/*` (18) | products/orders/subs/coupon/cart/wishlist |
| 8 | E-learning (LMS/Quiz) | M (largest) | `api/packages/quiz/*` (32) | topics tree, quiz_set, attempts→CH |
| 9 | Public Website | R | `web/*` | Next.js SSR/ISR |
| 10 | API Layer | M/R | `api/index.php`, `apiCore` | generic controller + legacy aliases |
| 11 | Media & File Mgmt | R | `helpers/imagework`, `imgen` | object storage + **image service** (§11.16) |
| 12 | Settings & Config | M | `get_network_details`, settings | typed tenant settings |
| 13 | Publisher Panel | R | `panel/publisher/*` | see 3b |
| 14 | Contacts / CRM + Email Mktg | M | `api/packages/contacts/*` (12) | standalone module (§11.14) |
| 15 | Email Ingestion (IMAP) | M/R | `jobs/mail/*.php` | worker → `ReceivedEmail` (§11.15) |
| 16 | Events / Webinars | M | `network/event.php`, `web/event_*` | `Event`+`EventTicket` (§11.17) |
| 17 | Network Admin Resources | M | `network/*` (32) | event, subscriber, token, ticket, staff, notice, domain, module, invoice, systemtag, fact/summary/raw |
| 18 | Content Spin / Thesaurus | M (util) | `helpers/spin/*` | small service, not a resource (§11.19) |
| 19 | Social Login | M | `hybidauth`, publisher auth | OAuth (FB/Google) (§11.20) |
| 20 | Scheduled Jobs / Cron | R | `cron/*.php` (17), `jobs/*` | queue workers (§11.21) |
| 21 | Notifications & Messaging | M | `cron/send_email`, `send_messages` | dispatch service (§11.22) |
| 22 | Docs / API Simulator | M | `doc/*` | generated from registry |

**Remove:** `/lps`, `/math-fast-trick_old`, `/t`, `/telebot`, `/tools`, `/utils`, scraping
(`helpers/scrape`, `*scrape*`), `bkp`/`old`/`discarded` dirs, AngularJS runtime, dev toys, redundant
job `_bkp`/`_old` copies, `hybidauth/libs` vendor bloat.

**Net change from v1:** added modules 3b (publisher surface), 14 (Contacts/CRM), 15 (IMAP), 16 (Events),
17 (Network resources enumeration), 18 (Spin), 19 (Social login), 20 (Jobs expanded), 21 (Notifications
split from CRM), 22 (Docs). Total 22 modules vs 13.
