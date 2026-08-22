import { apiRequest } from './client';

/**
 * The PDF study library: formula sheets and NCERT Highlights.
 * Mirrors backend/src/types/library-schemas.ts.
 *
 * Note what the catalogue does NOT carry: the PDF link. Listing gives titles
 * only, and `open()` is the payment-gated call that returns the actual URL.
 */
export type LibraryKind = 'formula_sheet' | 'ncert_highlight';

export interface LibraryDocument {
  id: string;
  slug: string;
  title: string;
  subject: string;
  grade: number;
  /** Present for NCERT Highlights; formula sheets have no chapter number. */
  chapterNumber: number | null;
  sizeBytes: number;
  /** Open without paying. Exactly one document per kind carries this. */
  isFreeSample: boolean;
}

export interface LibraryDocumentDetail extends LibraryDocument {
  url: string;
}

export interface ListLibraryQuery {
  kind: LibraryKind;
  subject?: string;
  grade?: number;
}

export const libraryApi = {
  list: (query: ListLibraryQuery) => {
    const params = new URLSearchParams({ kind: query.kind });
    if (query.subject) params.set('subject', query.subject);
    if (query.grade) params.set('grade', String(query.grade));
    return apiRequest<LibraryDocument[]>(`/library?${params.toString()}`);
  },

  /** Returns the PDF link. 403s for a locked student on a non-sample document. */
  open: (id: string) => apiRequest<LibraryDocumentDetail>(`/library/${id}`),
};
