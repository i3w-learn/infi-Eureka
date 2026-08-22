import Razorpay from 'razorpay';
import type { CreateOrderInput, GatewayOrder, IPaymentGateway } from './payment-gateway.interface.js';

/**
 * The real Razorpay client, created lazily so the server boots fine before the
 * keys are in .env — only the payment endpoints need them, and they fail with
 * a clear message instead of the whole app refusing to start.
 */
export class RazorpayGateway implements IPaymentGateway {
  private client: Razorpay | null = null;

  constructor(
    private readonly razorpayKeyId: string,
    private readonly razorpayKeySecret: string,
  ) {}

  isConfigured(): boolean {
    return this.razorpayKeyId !== '' && this.razorpayKeySecret !== '';
  }

  keyId(): string {
    return this.razorpayKeyId;
  }

  async createOrder(input: CreateOrderInput): Promise<GatewayOrder> {
    this.client ??= new Razorpay({ key_id: this.razorpayKeyId, key_secret: this.razorpayKeySecret });
    const order = await this.client.orders.create({
      amount: input.amountPaise,
      currency: input.currency,
      receipt: input.receipt,
    });
    return { orderId: order.id };
  }
}
