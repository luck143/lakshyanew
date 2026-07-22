// apps/api/src/payments.ts
// Payment abstraction (ADR-008). The storefront checkout currently uses the `mock` gateway, which
// "authorizes" immediately and returns a reference id — no real money moves. Swap to `razorpay`/
// `stripe` by setting PAYMENT_GATEWAY and supplying keys; the rest of the order flow is unchanged.
export type Gateway = 'mock' | 'razorpay' | 'stripe';

export interface PaymentResult {
  ok: boolean;
  ref?: string; // gateway transaction/reference id
  message?: string;
}

export function gatewayFromEnv(): Gateway {
  const g = (process.env.PAYMENT_GATEWAY || 'mock').toLowerCase();
  return g === 'razorpay' || g === 'stripe' ? g : 'mock';
}

// Authorize a payment for an order. Returns ok=false for declined/simulated failure.
export async function authorizePayment(orderId: string, amount: number, currency: string): Promise<PaymentResult> {
  const gw = gatewayFromEnv();
  if (gw === 'mock') {
    // simulate success; deterministic for tests
    return { ok: true, ref: `mock_${orderId.slice(0, 8)}` };
  }
  // Real gateways: implement server-side capture/verify here. Until configured, fail closed.
  return { ok: false, message: `Gateway '${gw}' not configured` };
}
