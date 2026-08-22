/**
 * A row in the `videos` table. A video has exactly one source: a file in our
 * storage (`file_path`) or a link on an external host (`external_url`).
 */
export interface VideoRow {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  file_path: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  mime_type: string;
  size_bytes: string; // BIGINT comes back from pg as a string
  created_at: string;
}
