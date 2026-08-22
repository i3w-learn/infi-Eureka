import { query, queryOne } from '../../config/db.js';
import type { NoteRow } from '../../models/note.js';
import type { INoteDao } from '../interfaces/note-dao.interface.js';

export class NoteDao implements INoteDao {
  async list(subject?: string): Promise<Omit<NoteRow, 'content_html'>[]> {
    const columns = 'id, title, subject, chapter, created_at';
    if (subject) {
      const result = await query<NoteRow>(
        `SELECT ${columns} FROM notes WHERE subject = $1 ORDER BY subject, chapter, title`,
        [subject],
      );
      return result.rows;
    }
    const result = await query<NoteRow>(`SELECT ${columns} FROM notes ORDER BY subject, chapter, title`);
    return result.rows;
  }

  async findById(id: string): Promise<NoteRow | null> {
    return queryOne<NoteRow>('SELECT * FROM notes WHERE id = $1', [id]);
  }
}
