import { query, queryOne } from '../../config/db.js';
import type { HighlightRow } from '../../models/note.js';
import type { CreateHighlightInput, IHighlightDao } from '../interfaces/highlight-dao.interface.js';

export class HighlightDao implements IHighlightDao {
  async listForUserAndNote(userId: string, noteId: string): Promise<HighlightRow[]> {
    const result = await query<HighlightRow>(
      'SELECT * FROM highlights WHERE user_id = $1 AND note_id = $2 ORDER BY start_offset',
      [userId, noteId],
    );
    return result.rows;
  }

  async create(input: CreateHighlightInput): Promise<HighlightRow> {
    const result = await query<HighlightRow>(
      `INSERT INTO highlights (user_id, note_id, highlighted_text, start_offset, end_offset)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.userId, input.noteId, input.highlightedText, input.startOffset, input.endOffset],
    );
    return result.rows[0]!;
  }

  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const row = await queryOne<{ id: string }>(
      'DELETE FROM highlights WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId],
    );
    return row !== null;
  }
}
