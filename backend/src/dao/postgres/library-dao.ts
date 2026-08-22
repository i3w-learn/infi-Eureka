import { query, queryOne } from '../../config/db.js';
import type { LibraryDocumentRow } from '../../models/library.js';
import type { ILibraryDao, LibraryFilter } from '../interfaces/library-dao.interface.js';

export class LibraryDao implements ILibraryDao {
  /** Free sample first — it leads the shelf, since it is what sells the rest. */
  async list(filter: LibraryFilter): Promise<LibraryDocumentRow[]> {
    const conditions = ['kind = $1'];
    const params: unknown[] = [filter.kind];

    if (filter.subject) {
      params.push(filter.subject);
      conditions.push(`subject = $${params.length}`);
    }
    if (filter.grade !== undefined) {
      params.push(filter.grade);
      conditions.push(`grade = $${params.length}`);
    }

    const result = await query<LibraryDocumentRow>(
      `SELECT * FROM library_documents
        WHERE ${conditions.join(' AND ')}
        ORDER BY is_free_sample DESC, subject, grade, chapter_number NULLS LAST, title`,
      params,
    );
    return result.rows;
  }

  async findById(id: string): Promise<LibraryDocumentRow | null> {
    return queryOne<LibraryDocumentRow>('SELECT * FROM library_documents WHERE id = $1', [id]);
  }

  async isFreeSample(id: string): Promise<boolean> {
    const row = await queryOne<{ is_free_sample: boolean }>(
      'SELECT is_free_sample FROM library_documents WHERE id = $1',
      [id],
    );
    return row?.is_free_sample ?? false;
  }
}
