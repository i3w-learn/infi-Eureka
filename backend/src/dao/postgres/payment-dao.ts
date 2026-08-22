import { query, queryOne, transaction } from '../../config/db.js';
import type { PaymentRow } from '../../models/payment.js';
import type {
  CreatePaymentInput,
  IPaymentDao,
  MarkPaidResult,
} from '../interfaces/payment-dao.interface.js';

export class PaymentDao implements IPaymentDao {
  async create(input: CreatePaymentInput): Promise<PaymentRow> {
    const result = await query<PaymentRow>(
      `INSERT INTO payments (user_id, plan_id, razorpay_order_id, amount_paise, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.userId, input.planId, input.razorpayOrderId, input.amountPaise, input.currency],
    );
    return result.rows[0]!;
  }

  async findByOrderId(razorpayOrderId: string): Promise<PaymentRow | null> {
    return queryOne<PaymentRow>('SELECT * FROM payments WHERE razorpay_order_id = $1', [razorpayOrderId]);
  }

  async markPaidAndUpgradeUser(
    razorpayOrderId: string,
    razorpayPaymentId: string | null,
  ): Promise<MarkPaidResult> {
    // Payment status and premium flag change together or not at all (FR-P-09).
    // FOR UPDATE serialises verify and the webhook racing on the same order.
    return transaction(async (client) => {
      const { rows } = await client.query<PaymentRow>(
        'SELECT * FROM payments WHERE razorpay_order_id = $1 FOR UPDATE',
        [razorpayOrderId],
      );
      const payment = rows[0];
      if (!payment) return 'not_found';
      if (payment.status === 'paid') return 'already_paid';
      if (payment.status !== 'created') return 'invalid_transition';

      await client.query(
        `UPDATE payments
            SET status = 'paid',
                razorpay_payment_id = COALESCE($2, razorpay_payment_id),
                updated_at = NOW()
          WHERE id = $1`,
        [payment.id, razorpayPaymentId],
      );
      await client.query('UPDATE users SET is_premium = TRUE, updated_at = NOW() WHERE id = $1', [
        payment.user_id,
      ]);
      return 'paid';
    });
  }

  async markFailed(razorpayOrderId: string): Promise<void> {
    // Only created -> failed (FR-P-13). A paid order is never demoted.
    await query(
      `UPDATE payments
          SET status = 'failed', updated_at = NOW()
        WHERE razorpay_order_id = $1 AND status = 'created'`,
      [razorpayOrderId],
    );
  }
}
