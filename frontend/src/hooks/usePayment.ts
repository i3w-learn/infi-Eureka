import { useCallback, useState } from 'react';
import { ApiError } from '../api/client';
import { paymentsApi } from '../api/payments.api';
import {
  loadRazorpayCheckout,
  type RazorpayFailure,
  type RazorpaySuccess,
} from '../lib/razorpay';
import { celebrate } from '../lib/animation';
import { useActivePlan } from './useActivePlan';
import { useAuth } from './useAuth';

/**
 * - idle      nothing in flight (also where a cancelled checkout lands)
 * - opening   fetching the order, then Razorpay's window is up
 * - verifying Razorpay said yes; the server is checking the signature
 * - done      the account is premium
 */
export type CheckoutStage = 'idle' | 'opening' | 'verifying' | 'done';

const BRAND_NAME = 'infi-Eureka';
/** --color-marigold, so Razorpay's window does not arrive in a stranger's blue. */
const BRAND_COLOUR = '#ef7126';

/**
 * The whole payment, start to finish.
 *
 * The browser is only ever a messenger here. It asks the server to open an
 * order (the server sets the amount), hands Razorpay the order id, and posts
 * Razorpay's three receipt values back for the server to check against its
 * secret. A "payment succeeded" message from this code unlocks nothing on its
 * own — `/payments/verify` re-computes the signature before believing it.
 */
export function usePayment() {
  const { user, refresh } = useAuth();
  // The same price the banners across the app read, from the same cache.
  const { plan, error: planError } = useActivePlan();
  const [stage, setStage] = useState<CheckoutStage>('idle');
  const [error, setError] = useState<string>();

  /** Razorpay said the payment went through; the server decides whether it did. */
  const confirmPayment = useCallback(
    async (response: RazorpaySuccess) => {
      setStage('verifying');
      try {
        await paymentsApi.verify({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        // Re-read the account rather than assuming: premium lives on the
        // server, and every gate in the app reads it from there.
        await refresh();
        setStage('done');
        celebrate();
      } catch (err: unknown) {
        // The money may well have left their account, and Razorpay's webhook
        // will unlock them anyway — so never tell them the payment failed.
        setStage('idle');
        setError(
          err instanceof ApiError
            ? err.message
            : 'We could not confirm the payment just now. If money left your account it unlocks within a few minutes — reload this page.',
        );
      }
    },
    [refresh],
  );

  const pay = useCallback(async () => {
    setError(undefined);
    setStage('opening');

    try {
      // Script and order both settled before the window opens, so a failure
      // in either is a plain message instead of a checkout that dies halfway.
      await loadRazorpayCheckout();
      const order = await paymentsApi.createOrder();

      const Checkout = window.Razorpay;
      if (!Checkout) throw new Error('Razorpay checkout did not load. Please try again.');

      const checkout = new Checkout({
        key: order.razorpayKeyId,
        amount: order.amountPaise,
        currency: order.currency,
        order_id: order.razorpayOrderId,
        name: BRAND_NAME,
        description: order.planName,
        prefill: { name: user?.name ?? '', contact: user?.phone ?? '' },
        theme: { color: BRAND_COLOUR },
        handler: (response) => {
          void confirmPayment(response);
        },
        modal: {
          // Closed the window without paying. Nothing was charged and the
          // order simply stays unpaid, so this is not an error to shout about.
          ondismiss: () => setStage((current) => (current === 'opening' ? 'idle' : current)),
        },
      });

      checkout.on('payment.failed', (failure: RazorpayFailure) => {
        setStage('idle');
        setError(
          failure.error?.description ?? 'The payment did not go through. Nothing was charged.',
        );
      });

      checkout.open();
    } catch (err: unknown) {
      setStage('idle');
      setError(
        err instanceof Error ? err.message : 'Could not open checkout. Please try again.',
      );
    }
  }, [confirmPayment, user]);

  return { plan, planError, stage, error, pay };
}
