import { apiRequest } from './client';

/**
 * The study-note API. Mirrors backend/src/types/note-schemas.ts.
 *
 * Titles are open to any signed-in student, paid or not, so the catalogue
 * shows what the payment buys. The body of a note is premium only — that is
 * the content the paywall actually protects.
 */
export interface NoteSummary {
  id: string;
  title: string;
  subject: string;
  chapter: string;
}

export interface Note extends NoteSummary {
  /** Sanitised HTML. Highlight offsets are into this exact string. */
  contentHtml: string;
}

export const notesApi = {
  list: (subject?: string) =>
    apiRequest<NoteSummary[]>(
      subject ? `/notes?subject=${encodeURIComponent(subject)}` : '/notes',
    ),

  get: (id: string) => apiRequest<Note>(`/notes/${id}`),
};
