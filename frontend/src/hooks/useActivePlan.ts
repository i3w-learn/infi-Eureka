import { useEffect, useState } from 'react';
import { ApiError } from '../api/client';
import { paymentsApi, type ActivePlan } from '../api/payments.api';

/**
 * The price, for every screen that shows it.
 *
 * The number lives in one place — the server's plans table, the same row it
 * bills from — so what a student reads and what their card is charged cannot
 * drift apart. Changing the price is a database update; no page needs editing
 * and nothing needs redeploying.
 *
 * Cached at module level rather than fetched per component: the landing page
 * alone shows the price twice, and the price cannot change mid-visit.
 */
let cached: ActivePlan | null = null;
let inFlight: Promise<ActivePlan> | null = null;

function loadPlan(): Promise<ActivePlan> {
  if (cached) return Promise.resolve(cached);

  // A failed fetch clears the promise so the next mount retries; a successful
  // one is kept forever, which is the whole point of the cache.
  inFlight ??= paymentsApi
    .activePlan()
    .then((plan) => {
      cached = plan;
      return plan;
    })
    .catch((err: unknown) => {
      inFlight = null;
      throw err;
    });

  return inFlight;
}

/**
 * `plan` is null until the price arrives. Callers render the price only once
 * it is there — a page that guesses at a number while loading is exactly the
 * hard-coding this hook exists to remove.
 */
export function useActivePlan(): { plan: ActivePlan | null; error?: string } {
  const [plan, setPlan] = useState<ActivePlan | null>(cached);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (cached) return;
    let cancelled = false;

    loadPlan()
      .then((active) => {
        if (!cancelled) setPlan(active);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load the price.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, ...(error ? { error } : {}) };
}
