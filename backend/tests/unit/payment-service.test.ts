import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { PaymentService } from '../../src/services/payment-service.js';
import {
  AlreadyPremiumError,
  InvalidSignatureError,
  NotFoundError,
  PaymentsNotConfiguredError,
} from '../../src/exceptions/app-error.js';
import type { IPlanDao } from '../../src/dao/interfaces/plan-dao.interface.js';
import type {
  CreatePaymentInput,
  IPaymentDao,
  MarkPaidResult,
} from '../../src/dao/interfaces/payment-dao.interface.js';
import type { IUserDao } from '../../src/dao/interfaces/user-dao.interface.js';
import type { IPaymentGateway } from '../../src/integrations/razorpay/payment-gateway.interface.js';
import type { PaymentRow, PlanRow } from '../../src/models/payment.js';
import type { UserRow } from '../../src/models/user.js';

const KEY_SECRET = 'unit-test-key-secret';
const WEBHOOK_SECRET = 'unit-test-webhook-secret';

const plan: PlanRow = {
  id: 'plan-1',
  name: 'NEET Complete Access',
  mrp_paise: '600000',
  price_paise: '349900',
  currency: 'INR',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
};

function paymentRow(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay-row-1',
    user_id: 'user-1',
    plan_id: plan.id,
    razorpay_order_id: 'order_123',
    razorpay_payment_id: null,
    amount_paise: '349900',
    currency: 'INR',
    status: 'created',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

class FakePlanDao implements IPlanDao {
  async findActive(): Promise<PlanRow | null> {
    return plan;
  }
}

/** In-memory payments + a premium flag, mimicking the transactional DAO. */
class FakePaymentDao implements IPaymentDao {
  payments = new Map<string, PaymentRow>();
  premiumUsers = new Set<string>();
  markPaidCalls = 0;

  async create(input: CreatePaymentInput): Promise<PaymentRow> {
    const row = paymentRow({
      razorpay_order_id: input.razorpayOrderId,
      user_id: input.userId,
      amount_paise: input.amountPaise,
    });
    this.payments.set(input.razorpayOrderId, row);
    return row;
  }

  async findByOrderId(orderId: string): Promise<PaymentRow | null> {
    return this.payments.get(orderId) ?? null;
  }

  async markPaidAndUpgradeUser(orderId: string, paymentId: string | null): Promise<MarkPaidResult> {
    this.markPaidCalls += 1;
    const row = this.payments.get(orderId);
    if (!row) return 'not_found';
    if (row.status === 'paid') return 'already_paid';
    row.status = 'paid';
    row.razorpay_payment_id = paymentId;
    this.premiumUsers.add(row.user_id);
    return 'paid';
  }

  async markFailed(orderId: string): Promise<void> {
    const row = this.payments.get(orderId);
    if (row && row.status === 'created') row.status = 'failed';
  }
}

class FakeUserDao implements IUserDao {
  constructor(private readonly premium: boolean) {}
  async findById(): Promise<UserRow | null> {
    return null;
  }
  async findByPhone(): Promise<UserRow | null> {
    return null;
  }
  async create(): Promise<UserRow> {
    throw new Error('not used');
  }
  async isPremium(): Promise<boolean> {
    return this.premium;
  }
}

class FakeGateway implements IPaymentGateway {
  constructor(private readonly configured = true) {}
  isConfigured(): boolean {
    return this.configured;
  }
  keyId(): string {
    return 'rzp_test_fake';
  }
  async createOrder(): Promise<{ orderId: string }> {
    return { orderId: 'order_123' };
  }
}

function sign(orderId: string, paymentId: string, secret = KEY_SECRET): string {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function service(paymentDao: FakePaymentDao, opts: { premium?: boolean; configured?: boolean } = {}) {
  return new PaymentService(
    new FakePlanDao(),
    paymentDao,
    new FakeUserDao(opts.premium ?? false),
    new FakeGateway(opts.configured ?? true),
    { keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET },
  );
}

describe('PaymentService.createOrder', () => {
  it('prices the order from the plans table, not the client (FR-P-05)', async () => {
    const dao = new FakePaymentDao();
    const order = await service(dao).createOrder('user-1');

    expect(order.amountPaise).toBe(349900);
    expect(order.razorpayOrderId).toBe('order_123');
    expect(dao.payments.get('order_123')?.status).toBe('created');
  });

  it('refuses an already-premium user (FR-P-07)', async () => {
    await expect(service(new FakePaymentDao(), { premium: true }).createOrder('user-1')).rejects.toThrow(
      AlreadyPremiumError,
    );
  });

  it('fails clearly when the Razorpay keys are not in .env yet', async () => {
    await expect(service(new FakePaymentDao(), { configured: false }).createOrder('user-1')).rejects.toThrow(
      PaymentsNotConfiguredError,
    );
  });
});

describe('PaymentService.verify (FR-P-08)', () => {
  let dao: FakePaymentDao;

  beforeEach(async () => {
    dao = new FakePaymentDao();
    await service(dao).createOrder('user-1');
  });

  it('accepts a valid signature and grants premium', async () => {
    const result = await service(dao).verify('user-1', {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_9',
      razorpaySignature: sign('order_123', 'pay_9'),
    });

    expect(result.isPremium).toBe(true);
    expect(dao.payments.get('order_123')?.status).toBe('paid');
    expect(dao.premiumUsers.has('user-1')).toBe(true);
  });

  it('rejects a tampered signature and changes nothing', async () => {
    await expect(
      service(dao).verify('user-1', {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_9',
        razorpaySignature: sign('order_123', 'pay_9', 'wrong-secret'),
      }),
    ).rejects.toThrow(InvalidSignatureError);

    expect(dao.payments.get('order_123')?.status).toBe('created');
    expect(dao.premiumUsers.size).toBe(0);
  });

  it("rejects someone else's order as not found, not forbidden", async () => {
    await expect(
      service(dao).verify('intruder', {
        razorpayOrderId: 'order_123',
        razorpayPaymentId: 'pay_9',
        razorpaySignature: sign('order_123', 'pay_9'),
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('is idempotent — replaying a valid verify stays premium, no double credit (FR-P-12)', async () => {
    const input = {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_9',
      razorpaySignature: sign('order_123', 'pay_9'),
    };
    await service(dao).verify('user-1', input);
    const replay = await service(dao).verify('user-1', input);

    expect(replay.isPremium).toBe(true);
    expect(dao.premiumUsers.size).toBe(1);
  });
});

describe('PaymentService.webhook (FR-P-10/11/12)', () => {
  function webhookBody(event: string, orderId: string): Buffer {
    return Buffer.from(
      JSON.stringify({
        event,
        payload: { payment: { entity: { id: 'pay_9', order_id: orderId } } },
      }),
    );
  }

  function webhookSignature(body: Buffer): string {
    return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  }

  let dao: FakePaymentDao;

  beforeEach(async () => {
    dao = new FakePaymentDao();
    await service(dao).createOrder('user-1');
  });

  it('a signed payment.captured webhook alone unlocks the user', async () => {
    const body = webhookBody('payment.captured', 'order_123');
    const result = await service(dao).webhook(body, webhookSignature(body));

    expect(result.handled).toBe(true);
    expect(dao.premiumUsers.has('user-1')).toBe(true);
  });

  it('rejects a wrong signature and changes nothing', async () => {
    const body = webhookBody('payment.captured', 'order_123');
    await expect(service(dao).webhook(body, 'not-the-signature')).rejects.toThrow(InvalidSignatureError);
    expect(dao.payments.get('order_123')?.status).toBe('created');
  });

  it('rejects a missing signature header', async () => {
    const body = webhookBody('payment.captured', 'order_123');
    await expect(service(dao).webhook(body, undefined)).rejects.toThrow(InvalidSignatureError);
  });

  it('verify then webhook (and again) leaves exactly one paid payment', async () => {
    await service(dao).verify('user-1', {
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_9',
      razorpaySignature: sign('order_123', 'pay_9'),
    });
    const body = webhookBody('payment.captured', 'order_123');
    await service(dao).webhook(body, webhookSignature(body));
    await service(dao).webhook(body, webhookSignature(body));

    expect(dao.payments.get('order_123')?.status).toBe('paid');
    expect(dao.premiumUsers.size).toBe(1);
  });

  it('payment.failed marks the payment failed (FR-P-14)', async () => {
    const body = webhookBody('payment.failed', 'order_123');
    await service(dao).webhook(body, webhookSignature(body));
    expect(dao.payments.get('order_123')?.status).toBe('failed');
  });

  it('ignores events it does not know', async () => {
    const body = webhookBody('refund.created', 'order_123');
    const result = await service(dao).webhook(body, webhookSignature(body));
    expect(result.handled).toBe(false);
  });
});
