import type { PaymentRow } from '../../models/payment.js';

export interface CreatePaymentInput {
  userId: string;
  planId: string;
  razorpayOrderId: string;
  amountPaise: string;
  currency: string;
}

/**
 * What happened when we tried to mark an order paid. 'already_paid' is a
 * success for the caller — verify and the webhook may both fire (FR-P-12).
 */
export type MarkPaidResult = 'paid' | 'already_paid' | 'not_found' | 'invalid_transition';

/** The contract for payment records. */
export interface IPaymentDao {
  create(input: CreatePaymentInput): Promise<PaymentRow>;
  findByOrderId(razorpayOrderId: string): Promise<PaymentRow | null>;
  /**
   * Sets the payment to 'paid' and the user to premium IN ONE TRANSACTION
   * (FR-P-09) — either both change or neither does. Safe to call any number
   * of times for the same order.
   */
  markPaidAndUpgradeUser(razorpayOrderId: string, razorpayPaymentId: string | null): Promise<MarkPaidResult>;
  /** created -> failed. Any other starting state is left untouched. */
  markFailed(razorpayOrderId: string): Promise<void>;
}
