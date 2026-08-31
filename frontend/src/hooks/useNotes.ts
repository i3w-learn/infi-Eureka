import { useEffect, useState } from 'react';
import { notesApi } from '../api/notes.api';
import { ApiError } from '../api/client';
import { SUBJECT_LABELS, type ContentItem, type Subject } from '../lib/sample-content';

const KNOWN_SUBJECTS: Subject[] = ['biology', 'physics', 'chemistry', 'botany', 'zoology'];

/**
 * The study notes, shaped for the shared content cards.
 *
 * Notes carry no class year and no free sample: the server gates every body
 * behind payment, so nothing here is marked free. `grade` stays null, which
 * hides the class filter rather than inventing a year the note does not have.
 */
export function useNotes(): { items: ContentItem[] | null; error?: string } {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    notesApi
      .list()
      .then((notes) => {
        if (cancelled) return;
        setItems(
          notes.map((note) => {
            const subject = KNOWN_SUBJECTS.includes(note.subject as Subject)
              ? (note.subject as Subject)
              : 'mixed';
            return {
              id: note.id,
              title: note.title,
              subject,
              classLabel: SUBJECT_LABELS[subject],
              grade: null,
              meta: note.chapter,
            };
          }),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load the notes.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, ...(error ? { error } : {}) };
}
