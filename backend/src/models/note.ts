/** A row in the `notes` table. */
export interface NoteRow {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  content_html: string;
  created_at: string;
}

/** A row in the `highlights` table — always owned by exactly one user. */
export interface HighlightRow {
  id: string;
  user_id: string;
  note_id: string;
  highlighted_text: string;
  start_offset: number;
  end_offset: number;
  created_at: string;
}
