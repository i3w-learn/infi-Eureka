import { query, queryOne } from '../../config/db.js';
import type { VideoRow } from '../../models/video.js';
import type { CreateVideoInput, IVideoDao } from '../interfaces/video-dao.interface.js';

export class VideoDao implements IVideoDao {
  async list(subject?: string): Promise<VideoRow[]> {
    if (subject) {
      const result = await query<VideoRow>(
        'SELECT * FROM videos WHERE subject = $1 ORDER BY subject, chapter, title',
        [subject],
      );
      return result.rows;
    }
    const result = await query<VideoRow>('SELECT * FROM videos ORDER BY subject, chapter, title');
    return result.rows;
  }

  async findById(id: string): Promise<VideoRow | null> {
    return queryOne<VideoRow>('SELECT * FROM videos WHERE id = $1', [id]);
  }

  async create(input: CreateVideoInput): Promise<VideoRow> {
    const result = await query<VideoRow>(
      `INSERT INTO videos
         (title, subject, chapter, file_path, external_url, thumbnail_url, duration_seconds, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.title,
        input.subject,
        input.chapter,
        input.filePath ?? null,
        input.externalUrl ?? null,
        input.thumbnailUrl ?? null,
        input.durationSeconds,
        input.mimeType ?? 'video/mp4',
        input.sizeBytes ?? 0,
      ],
    );
    return result.rows[0]!;
  }
}
