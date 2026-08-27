const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/** The three values Razorpay hands back on success. Only the server can judge them. */
export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailure {
  error?: { description?: string; reason?: string };
}

/** Only the options we actually pass; Razorpay accepts many more. */
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

/**
 * The load is kept in one promise so a student who clicks twice, or comes
 * back to the page, never gets a second copy of the script on the page.
 */
let loading: Promise<void> | null = null;

/**
 * Fetches Razorpay's checkout script, on the click that needs it rather than
 * in index.html. Most page views never reach checkout, and a third-party
 * script on every one of them is a cost paid for nothing.
 */
export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let the next click try again — the failure is usually the network,
      // not the script, and a student should not have to reload the page.
      loading = null;
      script.remove();
      reject(new Error('Could not reach Razorpay. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  return loading;
}
