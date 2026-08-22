import type { NoteRow } from '../../models/note.js';

/** The contract for reading notes. Content only goes in through seeds for v1. */
export interface INoteDao {
  /** Metadata only — the list never carries note bodies. */
  list(subject?: string): Promise<Omit<NoteRow, 'content_html'>[]>;
  findById(id: string): Promise<NoteRow | null>;
}
