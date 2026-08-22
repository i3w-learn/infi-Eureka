import { useEffect, useState } from 'react';
import { testsApi } from '../api/tests.api';
import { ApiError } from '../api/client';
import type { ContentItem, Subject } from '../lib/sample-content';

const KNOWN_SUBJECTS: Subject[] = ['biology', 'physics', 'chemistry'];

/**
 * The mock-test catalogue, shaped for the shared content cards.
 *
 * One fetch feeding both the dashboard shelf and the full catalogue, so the
 * two can never disagree about what exists or which test is free. `free`
 * mirrors the server's flag rather than "first in the list" — the badge and
 * the gate that actually opens the test read the same source.
 */
export function useMockTests(): {
  items: ContentItem[] | null;
  error?: string;
} {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    testsApi
      .list()
      .then((tests) => {
        if (cancelled) return;
        setItems(
          tests.map((test) => ({
            id: test.id,
            title: test.title,
            subject: KNOWN_SUBJECTS.includes(test.subject as Subject)
              ? (test.subject as Subject)
              : 'mixed',
            classLabel: 'NEET pattern',
            meta: `${test.questionCount} Q · ${test.durationMinutes} min · ${test.totalMarks} marks`,
            free: test.isFreeSample,
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load the tests.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, error };
}
