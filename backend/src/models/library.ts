/** The two kinds of PDF study material in the library. */
export type LibraryKind = 'formula_sheet' | 'ncert_highlight';

/** A row in the `library_documents` table. */
export interface LibraryDocumentRow {
  id: string;
  kind: LibraryKind;
  slug: string;
  title: string;
  subject: string;
  grade: number;
  chapter_number: number | null;
  url: string;
  size_bytes: string; // BIGINT arrives from pg as a string
  is_free_sample: boolean;
  created_at: string;
}
