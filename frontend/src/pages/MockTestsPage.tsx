import { useEffect, useState } from 'react';
import { CatalogPage } from '../components/CatalogPage';
import { testsApi } from '../api/tests.api';
import { ApiError } from '../api/client';
import type { ContentItem, Subject } from '../lib/sample-content';

const KNOWN_SUBJECTS: Subject[] = ['biology', 'physics', 'chemistry'];

/**
 * The mock-test catalogue — the one section already backed by the real API.
 * Tests come from GET /tests; starting one creates a server-timed attempt.
 */
export function MockTestsPage() {
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
          })),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load the tests.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <CatalogPage
        title="CBT mock tests"
        subtitle={error}
        items={[]}
        kind="test"
        detailBase="/mock-tests"
      />
    );
  }

  return (
    <CatalogPage
      title="CBT mock tests"
      subtitle="The real exam interface: timed by the server, question palette, mark for review."
      items={items ?? []}
      kind="test"
      detailBase="/mock-tests"
      detailSuffix="/attempt"
    />
  );
}
