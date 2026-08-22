import type { VideoRow } from '../../models/video.js';

export interface CreateVideoInput {
  title: string;
  subject: string;
  chapter: string;
  /** Exactly one of filePath / externalUrl — the database enforces it. */
  filePath?: string | undefined;
  externalUrl?: string | undefined;
  thumbnailUrl?: string | undefined;
  durationSeconds: number;
  mimeType?: string | undefined;
  sizeBytes?: number | undefined;
}

/** The contract for the video catalogue. Files live in storage, not here. */
export interface IVideoDao {
  list(subject?: string): Promise<VideoRow[]>;
  findById(id: string): Promise<VideoRow | null>;
  create(input: CreateVideoInput): Promise<VideoRow>;
}
