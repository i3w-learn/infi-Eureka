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

function send(event: string, params: Record<string, unknown> = {}): void {
  window.gtag?.('event', event, params);
}

export function trackPageView(path: string): void {
  if (!MEASUREMENT_ID) return;
  window.gtag?.('event', 'page_view', { page_path: path });
}

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
  videoPlayed: (videoId: string) => send('video_played', { video_id: videoId }),
  noteOpened: (noteId: string) => send('note_opened', { note_id: noteId }),
  testStarted: (testId: string) => send('test_started', { test_id: testId }),
  testSubmitted: (testId: string, score: number) => send('test_submitted', { test_id: testId, score }),
};
