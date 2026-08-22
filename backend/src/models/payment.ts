/** A row in the `plans` table. Money is BIGINT paise, which pg returns as strings. */
export interface PlanRow {
  id: string;
  name: string;
  mrp_paise: string;
  price_paise: string;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export type PaymentStatus = 'created' | 'paid' | 'failed';

/** A row in the `payments` table. */
export interface PaymentRow {
  id: string;
  user_id: string;
  plan_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount_paise: string;
  currency: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}
