import { apiRequest } from './client';

/**
 * Razorpay checkout, mirroring backend/src/types/payment-schemas.ts.
 *
 * Money is in paise everywhere — rupees as floating point lose money. Note
 * what this module never sends: the amount. The server reads it from the
 * plans table, so a student cannot name their own price.
 */

export interface ActivePlan {
  id: string;
  name: string;
  /** The struck-through price. */
  mrpPaise: number;
  pricePaise: number;
  currency: string;
}

export interface CreatedOrder {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  /** The public key id Razorpay Checkout needs. Never the secret. */
  razorpayKeyId: string;
  planName: string;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export const paymentsApi = {
  /** Open to everyone — the price is shown before login. */
  activePlan: () => apiRequest<ActivePlan>('/plans/active'),

  // An empty object rather than no body at all: the route accepts `{}` and
  // rejects any field in it, so this is the one shape that always passes.
  createOrder: () =>
    apiRequest<CreatedOrder>('/payments/create-order', { method: 'POST', body: {} }),

  verify: (input: VerifyPaymentInput) =>
    apiRequest<{ isPremium: boolean }>('/payments/verify', { method: 'POST', body: input }),
};

/** 349900 → '₹3,499'. Paise are dropped: everything we sell is whole rupees. */
export function formatPaise(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}
