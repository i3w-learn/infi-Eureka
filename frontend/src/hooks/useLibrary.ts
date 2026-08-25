import { useEffect, useState } from 'react';
import { libraryApi, type LibraryKind } from '../api/library.api';
import { ApiError } from '../api/client';
import type { ContentItem, Subject } from '../lib/sample-content';

const KNOWN_SUBJECTS: Subject[] = ['biology', 'physics', 'chemistry'];

/** '5.1 MB' — students judge a download by its size, so it earns the meta line. */
function formatSize(bytes: number): string {
  if (bytes <= 0) return 'PDF';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * One kind of library document, shaped for the shared content cards.
 *
 * Feeds both the dashboard shelf and the full catalogue from one fetch, so the
 * two can never disagree. `free` mirrors the server's flag rather than
 * "first in the list" — the badge and the gate that actually opens the PDF
 * read the same source.
 */
interface LoadedLibrary {
  /** Which kind this result belongs to, so a stale one reads as "loading". */
  kind: LibraryKind;
  items?: ContentItem[];
  error?: string;
}

export function useLibrary(kind: LibraryKind): {
  items: ContentItem[] | null;
  error?: string;
} {
  const [loaded, setLoaded] = useState<LoadedLibrary | null>(null);

  useEffect(() => {
    let cancelled = false;

    libraryApi
      .list({ kind })
      .then((documents) => {
        if (cancelled) return;
        setLoaded({
          kind,
          items: documents.map((document) => ({
            id: document.id,
            title: document.title,
            subject: KNOWN_SUBJECTS.includes(document.subject as Subject)
              ? (document.subject as Subject)
              : 'mixed',
            classLabel: `Class ${document.grade}`,
            grade: document.grade,
            chapterNumber: document.chapterNumber,
            meta:
              document.chapterNumber === null
                ? formatSize(document.sizeBytes)
                : `Chapter ${document.chapterNumber} · ${formatSize(document.sizeBytes)}`,
            free: document.isFreeSample,
          })),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoaded({
          kind,
          error: err instanceof ApiError ? err.message : 'Could not load these documents.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [kind]);

  // A result for a different kind is last render's answer — treat it as not
  // arrived yet rather than briefly showing the wrong shelf.
  const current = loaded?.kind === kind ? loaded : null;
  return { items: current?.items ?? null, ...(current?.error ? { error: current.error } : {}) };
}
