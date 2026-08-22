export interface CreateOrderInput {
  amountPaise: number;
  currency: string;
  /** Our own reference for the order — the payment row's id. */
  receipt: string;
}

export interface GatewayOrder {
  orderId: string;
}

/**
 * The contract for the payment gateway. Services depend on this, never on the
 * Razorpay SDK, so tests use a fake and the vendor never leaks upward.
 */
export interface IPaymentGateway {
  /** False until the gateway keys are present in .env. */
  isConfigured(): boolean;
  /** The public key id the frontend needs to open checkout. */
  keyId(): string;
  createOrder(input: CreateOrderInput): Promise<GatewayOrder>;
}
