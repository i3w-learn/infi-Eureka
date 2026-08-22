import type { HighlightRow } from '../../models/note.js';

export interface CreateHighlightInput {
  userId: string;
  noteId: string;
  highlightedText: string;
  startOffset: number;
  endOffset: number;
}

/**
 * The contract for per-user highlights. Every read and delete is scoped by
 * user id IN THE QUERY — a highlight that is not yours simply does not come
 * back, which is what makes cross-user access impossible (FR-N-06/08).
 */
export interface IHighlightDao {
  listForUserAndNote(userId: string, noteId: string): Promise<HighlightRow[]>;
  create(input: CreateHighlightInput): Promise<HighlightRow>;
  /** True if a row was deleted; false means "not found or not yours". */
  deleteOwned(id: string, userId: string): Promise<boolean>;
}
