/**
 * Google Analytics 4.
 *
 * The rest of the app never touches `gtag` directly — it calls `track.*` below.
 * That keeps event names consistent and means swapping analytics vendors is a
 * change to this one file.
 *
 * Set VITE_GA4_MEASUREMENT_ID in `.env` to switch it on; with no ID every call
 * here is a no-op, so development never pollutes real analytics data.
 */

const MEASUREMENT_ID = import.meta.env['VITE_GA4_MEASUREMENT_ID'] as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics(): void {
  if (!MEASUREMENT_ID) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  // We send page views ourselves on route change, so GA should not guess.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

/**
 * Tie everything that follows to one student.
 *
 * Without this, a student who signs up on a phone and pays on a laptop is two
 * unrelated strangers in the reports, and no question with a "then" in it —
 * *did the ones who watched videos then pay?* — can be answered at all.
 *
 * The id is our own UUID, which means nothing to Google and everything to us:
 * we can look up who it belongs to in our database, and they cannot. A name,
 * phone or email here would be personal data in someone else's system, which
 * FR-G-04 forbids and Google suspends properties over.
 *
 * Pass null on logout so the next person on a shared computer starts clean.
 */
export function identify(userId: string | null): void {
  if (!MEASUREMENT_ID) return;
  window.gtag?.('config', MEASUREMENT_ID, {
    send_page_view: false,
    user_id: userId ?? undefined,
  });
}

function send(event: string, params: Record<string, unknown> = {}): void {
  window.gtag?.('event', event, params);
}

export function trackPageView(path: string): void {
  if (!MEASUREMENT_ID) return;
  window.gtag?.('event', 'page_view', { page_path: path });
}

/** What a student was reaching for when the paywall stopped them. */
export type PaywallContent = 'video' | 'test' | 'document' | 'chapter';

/**
 * Every event the app reports, named in one place.
 *
 * These names are fixed by the SRS (FR-G-03) — GA4 reports are built on them,
 * so renaming one silently breaks historical data.
 *
 * Content ids and titles are fine to send. Never send a name, email or any
 * other personal detail (FR-G-04).
 */
export const track = {
  signupCompleted: () => send('sign_up', { method: 'email' }),
  loginCompleted: () => send('login', { method: 'email' }),
  checkoutOpened: (amount: number) => send('checkout_opened', { currency: 'INR', value: amount }),
  paymentCompleted: (amount: number) => send('payment_completed', { currency: 'INR', value: amount }),
  /**
   * A student reached for something locked.
   *
   * The most useful event we report: it is the exact moment someone wants
   * what we sell. `contentId` turns the paywall from a single number into a
   * ranked list of what students will actually pay for.
   */
  paywallHit: (contentType: PaywallContent, contentId: string) =>
    send('paywall_hit', { content_type: contentType, content_id: contentId }),
  videoPlayed: (videoId: string) => send('video_played', { video_id: videoId }),
  noteOpened: (noteId: string) => send('note_opened', { note_id: noteId }),
  testStarted: (testId: string) => send('test_started', { test_id: testId }),
  testSubmitted: (testId: string, score: number) => send('test_submitted', { test_id: testId, score }),
};
