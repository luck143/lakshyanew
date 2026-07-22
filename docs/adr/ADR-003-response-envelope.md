# ADR-003: API Response Envelope

**Status:** Proposed · **Date:** 2026-07-19

## Context
Old API returns `{status: 1|0, data, message}`. Many existing/public clients (and the old panel JS)
depend on this shape. New public site and admin will be greenfield.

## Decision
**Preserve the existing envelope during cutover**, with an optional standards-compliant mode:
```
{ "status": 1, "data": ..., "message": "..." }   // legacy-compatible (default in v1)
```
Internally use typed errors; map to `status:0` + `message` for legacy, and to HTTP status +
`{error:{code,message}}` for the new typed client. Provide `/api/v1/...` (legacy envelope) and
`/api/v2/...` (standard) where helpful.

## Rationale
- Lowest-risk cutover; old tokens/clients keep working.
- New frontend uses the generated typed client regardless of envelope.

## Consequences
- ✅ No client breakage at cutover.
- ⚠️ Two shapes to support short-term; deprecate legacy envelope after full cutover (ADR tracked).
