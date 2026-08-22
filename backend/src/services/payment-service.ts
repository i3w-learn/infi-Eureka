import type { IPaymentDao } from '../dao/interfaces/payment-dao.interface.js';
import type { IPlanDao } from '../dao/interfaces/plan-dao.interface.js';
import type { IUserDao } from '../dao/interfaces/user-dao.interface.js';
import type { IPaymentGateway } from '../integrations/razorpay/payment-gateway.interface.js';
import {
  AlreadyPremiumError,
  InvalidSignatureError,
  NotFoundError,
  PaymentsNotConfiguredError,
} from '../exceptions/app-error.js';
import { verifyCheckoutSignature, verifyWebhookSignature } from '../utils/razorpay-signature.js';

export interface ActivePlan {
  id: string;
  name: string;
  mrpPaise: number;
  pricePaise: number;
  currency: string;
}

export interface CreatedOrder {
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  /** The public key id the frontend hands to Razorpay checkout. */
  razorpayKeyId: string;
  planName: string;
}

export interface VerifyInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface WebhookPayload {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string } };
    order?: { entity?: { id?: string } };
  };
}

export class PaymentService {
  constructor(
    private readonly planDao: IPlanDao,
    private readonly paymentDao: IPaymentDao,
    private readonly userDao: IUserDao,
    private readonly gateway: IPaymentGateway,
    private readonly secrets: { keySecret: string; webhookSecret: string },
  ) {}

  async activePlan(): Promise<ActivePlan> {
    const plan = await this.planDao.findActive();
    if (!plan) throw new NotFoundError('No plan is on sale right now.');
    return {
      id: plan.id,
      name: plan.name,
      mrpPaise: Number(plan.mrp_paise),
      pricePaise: Number(plan.price_paise),
      currency: plan.currency,
    };
  }

  /**
   * The amount comes from the plans table, full stop (FR-P-05). The client
   * sends nothing but the request itself.
   */
  async createOrder(userId: string): Promise<CreatedOrder> {
    if (!this.gateway.isConfigured() || this.secrets.keySecret === '') {
      throw new PaymentsNotConfiguredError();
    }
    if (await this.userDao.isPremium(userId)) throw new AlreadyPremiumError();

    const plan = await this.activePlan();
    const order = await this.gateway.createOrder({
      amountPaise: plan.pricePaise,
      currency: plan.currency,
      receipt: `${userId.slice(0, 8)}-${Date.now()}`,
    });
    const payment = await this.paymentDao.create({
      userId,
      planId: plan.id,
      razorpayOrderId: order.orderId,
      amountPaise: String(plan.pricePaise),
      currency: plan.currency,
    });

    return {
      razorpayOrderId: payment.razorpay_order_id,
      amountPaise: Number(payment.amount_paise),
      currency: payment.currency,
      razorpayKeyId: this.gateway.keyId(),
      planName: plan.name,
    };
  }

  /**
   * Checkout success handed back by the browser. The signature is the proof —
   * a "success" message alone proves nothing (FR-P-08).
   */
  async verify(userId: string, input: VerifyInput): Promise<{ isPremium: true }> {
    const payment = await this.paymentDao.findByOrderId(input.razorpayOrderId);
    // Missing and someone-else's-order look identical from outside.
    if (!payment || payment.user_id !== userId) throw new NotFoundError('This order does not exist.');

    const valid = verifyCheckoutSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature,
      this.secrets.keySecret,
    );
    if (!valid) throw new InvalidSignatureError();

    await this.paymentDao.markPaidAndUpgradeUser(input.razorpayOrderId, input.razorpayPaymentId);
    return { isPremium: true };
  }

  /**
   * Razorpay's server-to-server callback — the backup that unlocks a student
   * whose browser never came back from checkout (FR-P-10). Returns whether we
   * acted; either way the route answers 200 so Razorpay stops retrying.
   */
  async webhook(rawBody: Buffer, signatureHeader: string | undefined): Promise<{ handled: boolean }> {
    if (this.secrets.webhookSecret === '' || !signatureHeader) throw new InvalidSignatureError();
    if (!verifyWebhookSignature(rawBody, signatureHeader, this.secrets.webhookSecret)) {
      throw new InvalidSignatureError();
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as WebhookPayload;
    } catch {
      throw new InvalidSignatureError();
    }

    const paymentEntity = payload.payload?.payment?.entity;
    switch (payload.event) {
      case 'payment.captured': {
        if (!paymentEntity?.order_id) return { handled: false };
        await this.paymentDao.markPaidAndUpgradeUser(paymentEntity.order_id, paymentEntity.id ?? null);
        return { handled: true };
      }
      case 'order.paid': {
        const orderId = payload.payload?.order?.entity?.id;
        if (!orderId) return { handled: false };
        await this.paymentDao.markPaidAndUpgradeUser(orderId, paymentEntity?.id ?? null);
        return { handled: true };
      }
      case 'payment.failed': {
        if (!paymentEntity?.order_id) return { handled: false };
        await this.paymentDao.markFailed(paymentEntity.order_id);
        return { handled: true };
      }
      default:
        return { handled: false };
    }
  }
}
