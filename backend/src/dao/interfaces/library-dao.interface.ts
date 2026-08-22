import type { LibraryDocumentRow, LibraryKind } from '../../models/library.js';

export interface LibraryFilter {
  kind: LibraryKind;
  subject?: string | undefined;
  grade?: number | undefined;
}

/** The contract for the PDF study library (formula sheets, NCERT highlights). */
export interface ILibraryDao {
  list(filter: LibraryFilter): Promise<LibraryDocumentRow[]>;
  findById(id: string): Promise<LibraryDocumentRow | null>;
  /** Whether this document is open without payment. */
  isFreeSample(id: string): Promise<boolean>;
}
