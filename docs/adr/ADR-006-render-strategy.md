# ADR-006: Public Site Render Strategy

**Status:** Proposed · **Date:** 2026-07-19

## Context
Public site (`web/*.php`) is server-rendered PHP, SEO-critical (quizset landings, blog, topics, home).
Next.js supports SSR, SSG, ISR, and CSR.

## Decision
| Surface | Strategy | Reason |
|---|---|---|
| Home, topic/quizset landings | **SSR** (or ISR 60–600s) | SEO, social cards, crawlability |
| Blog posts, notes, articles | **ISR** (revalidate on publish) | SEO + freshness, cheap |
| Quiz take/answer engine | **CSR** inside SSR shell | real-time timer/state; shell SSR for SEO |
| Rankings, dashboards | **CSR** (auth) | personalized, no SEO need |
| Sitemap/robots | **SSG/route** | static |

## Rationale
- SEO is a hard requirement for the public product; SSR/ISR satisfies it.
- Quiz engine needs client state; wrapping it in an SSR shell keeps the URL crawlable and shareable.

## Consequences
- ✅ Meets SEO; clear per-page strategy; cheap static where possible.
- ⚠️ Must implement revalidation hooks on content publish (admin save → `revalidateTag`).
