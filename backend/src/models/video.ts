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
  /** Canonical YouTube watch URL; the player derives the embed from it. */
  youtube_url: string | null;
  /** YouTube permits this video inside an iframe on our site. */
  is_embeddable: boolean;
  thumbnail_url: string | null;
  duration_seconds: number;
  mime_type: string;
  size_bytes: string; // BIGINT comes back from pg as a string
  /** 11 or 12; NULL for a lecture that spans both. */
  grade: number | null;
  educator_name: string | null;
  /** Open to any signed-in student, paid or not. At most one video is. */
  is_free_sample: boolean;
  created_at: string;
}
