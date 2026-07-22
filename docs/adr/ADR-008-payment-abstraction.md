# ADR-008: Payment gateway abstraction (swappable, fail-closed)

**Status:** Accepted (2026-07-20)
**Context:** The storefront must collect payment at checkout. Real gateways (Razorpay, Stripe) need
provider accounts, keys, and webhook verification that are out of scope for local development and
for the current environment. We still want the order→paid transition wired end-to-end.
**Decision:** Introduce a single `payments.ts` module exposing `authorizePayment(orderId, amount,
currency) -> { ok, ref?, message? }` and a `gatewayFromEnv()` selector driven by `PAYMENT_GATEWAY`
(default `mock`). The API route `POST /api/orders/:id/pay` calls it and, on success, flips
`Order.status` `pending -> paid`, records `paymentRef` + `paidAt`. Unknown/real gateways that aren't
configured **fail closed** (402), never silently marking an order paid.
**Rationale:** The order lifecycle, admin surface, and storefront are gateway-agnostic. Swapping to a
real provider later is a localized change in `payments.ts` plus webhook handling — no schema or
route changes. `mock` lets the entire purchase flow be demonstrated and tested without external
dependencies.
**Consequences:** Production requires setting `PAYMENT_GATEWAY` + keys and implementing the real
`authorizePayment` (server-side capture/verify) and a webhook to reconcile `paid`. Until then, only
the mock path is live. `Order` gained `paymentRef` + `paidAt` columns.
