import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Readable } from 'node:stream';
import type { IVideoDao } from '../dao/interfaces/video-dao.interface.js';
import type { IStorage } from '../integrations/storage/storage.interface.js';
import type { VideoRow } from '../models/video.js';
import {
  NotFoundError,
  RangeNotSatisfiableError,
  UnauthenticatedError,
  ValidationError,
} from '../exceptions/app-error.js';
import { createStreamToken, readStreamToken } from '../utils/token.js';
import { parseRangeHeader } from '../utils/http-range.js';

const STREAM_TOKEN_TTL_SECONDS = 5 * 60;

export interface VideoSummary {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  /**
   * How this lecture plays: 'youtube' embeds the original video, 'link' plays
   * an external URL directly, 'file' streams our own copy.
   */
  sourceKind: 'youtube' | 'link' | 'file';
  /** 11 or 12; null for a lecture spanning both. */
  grade: number | null;
  educatorName: string | null;
  /** Playable without paying. Exactly one video carries this. */
  isFreeSample: boolean;
}

/** What a premium user needs to actually play a video. */
export type WatchSource =
  | { kind: 'youtube'; videoId: string; embedUrl: string }
  | { kind: 'link'; url: string }
  | { kind: 'stream'; token: string; expiresIn: number };

export interface AddVideoByLinkInput {
  title: string;
  subject: string;
  chapter: string;
  externalUrl: string;
  durationSeconds?: number | undefined;
  thumbnailUrl?: string | undefined;
}

export interface UploadVideoInput {
  title: string;
  subject: string;
  chapter: string;
  durationSeconds: number;
  thumbnailUrl?: string | undefined;
  mimeType: string;
  filename: string;
  file: Readable;
}

/** Everything the route needs to answer a stream request, HTTP-agnostic. */
export interface VideoStream {
  stream: Readable;
  mimeType: string;
  sizeBytes: number;
  /** Present for a 206 partial response; absent means "whole file, 200". */
  range?: { start: number; end: number };
}

/**
 * Pulls the 11-character id out of any YouTube URL shape the catalogue uses:
 * youtu.be/ID, watch?v=ID, live/ID and embed/ID all appear in the source data.
 */
export function youtubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:live|embed|shorts)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Built from the id rather than passed through from the stored URL, so only a
 * known-good YouTube address can ever reach the player's iframe.
 * `rel=0` keeps YouTube's end-screen suggestions to the same channel, so a
 * student is not offered someone else's lecture the moment ours finishes.
 */
export function embedUrlFor(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
}

function toSummary(row: VideoRow): VideoSummary {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    chapter: row.chapter,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    // Same precedence watch() plays by: a permitted embed wins, then our copy.
    sourceKind:
      row.youtube_url && row.is_embeddable
        ? 'youtube'
        : row.file_path
          ? 'file'
          : row.external_url
            ? 'link'
            : 'file',
    grade: row.grade,
    educatorName: row.educator_name,
    isFreeSample: row.is_free_sample,
  };
}

export class VideoService {
  constructor(
    private readonly videoDao: IVideoDao,
    private readonly storage: IStorage,
  ) {}

  async list(subject?: string): Promise<VideoSummary[]> {
    const rows = await this.videoDao.list(subject);
    return rows.map(toSummary);
  }

  async get(id: string): Promise<VideoSummary> {
    const row = await this.videoDao.findById(id);
    if (!row) throw new NotFoundError('This video does not exist.');
    return toSummary(row);
  }

  /**
   * The playback source for a premium user (the route enforces premium).
   * Self-hosted videos hand back a stream token the player appends as `?t=`
   * on the stream endpoint; external ones their link or embed.
   */
  async watch(userId: string, videoId: string): Promise<WatchSource> {
    const video = await this.videoDao.findById(videoId);
    if (!video) throw new NotFoundError('This video does not exist.');
    // Prefer the embed, but only where YouTube will actually play it. Roughly
    // half these lectures are live streams whose owner disabled off-site
    // playback, and an embed of one renders YouTube's "Video unavailable" card;
    // the iframe is cross-origin, so we would never learn it had failed. Hence
    // the stored flag, set by scripts/check-embeddable.js.
    //
    // Embedding first matters beyond correctness: YouTube serves the bytes and
    // adapts quality to the connection, which our own mp4 cannot do.
    const embedId = video.youtube_url && video.is_embeddable ? youtubeId(video.youtube_url) : null;
    if (embedId) return { kind: 'youtube', videoId: embedId, embedUrl: embedUrlFor(embedId) };

    // Otherwise our own copy. Statted rather than assumed so a row whose file
    // has gone missing degrades to the next source instead of failing later,
    // mid-stream, with nothing to show the student.
    if (video.file_path && (await this.storage.stat(video.file_path))) {
      return { kind: 'stream', token: createStreamToken(userId, videoId), expiresIn: STREAM_TOKEN_TTL_SECONDS };
    }

    // No stored copy and the embed is blocked: send the embed anyway. It shows
    // YouTube's own card with a "Watch on YouTube" button, which is a worse
    // experience but still a way through — better than an error page.
    if (video.youtube_url) {
      const id = youtubeId(video.youtube_url);
      if (id) return { kind: 'youtube', videoId: id, embedUrl: embedUrlFor(id) };
    }
    if (video.external_url) return { kind: 'link', url: video.external_url };
    throw new NotFoundError('This video has no source to play from.');
  }

  /**
   * A short-lived token the player appends as `?t=` (FR-V-06). Only issued to
   * premium users — the route enforces that — and only for a self-hosted video.
   */
  async issueStreamToken(userId: string, videoId: string): Promise<{ token: string; expiresIn: number }> {
    const video = await this.videoDao.findById(videoId);
    if (!video) throw new NotFoundError('This video does not exist.');
    if (video.external_url) {
      throw new ValidationError('This video plays from an external link — call /watch instead.');
    }
    return { token: createStreamToken(userId, videoId), expiresIn: STREAM_TOKEN_TTL_SECONDS };
  }

  /** Opens the file (or a byte range of it) after checking the stream token. */
  async openStream(videoId: string, token: string, rangeHeader?: string): Promise<VideoStream> {
    const claims = readStreamToken(token);
    if (!claims || claims.videoId !== videoId) {
      throw new UnauthenticatedError('This stream link has expired. Reload the page and try again.');
    }

    const video = await this.videoDao.findById(videoId);
    if (!video) throw new NotFoundError('This video does not exist.');
    if (!video.file_path) {
      throw new ValidationError('This video plays from an external link — call /watch instead.');
    }

    const stat = await this.storage.stat(video.file_path);
    if (!stat) throw new NotFoundError('This video file is missing from storage.');

    const range = parseRangeHeader(rangeHeader, stat.sizeBytes);
    if (range === 'unsatisfiable') throw new RangeNotSatisfiableError();

    if (range) {
      return {
        stream: this.storage.createReadStream(video.file_path, range),
        mimeType: video.mime_type,
        sizeBytes: stat.sizeBytes,
        range,
      };
    }
    return {
      stream: this.storage.createReadStream(video.file_path),
      mimeType: video.mime_type,
      sizeBytes: stat.sizeBytes,
    };
  }

  /** Catalogue entry for a video hosted elsewhere — we store only its link. */
  async addByLink(input: AddVideoByLinkInput): Promise<VideoSummary> {
    const row = await this.videoDao.create({
      title: input.title,
      subject: input.subject,
      chapter: input.chapter,
      externalUrl: input.externalUrl,
      thumbnailUrl: input.thumbnailUrl,
      durationSeconds: input.durationSeconds ?? 0,
    });
    return toSummary(row);
  }

  /**
   * File and database row land together or not at all (FR-V-09): the file is
   * written first, and if the insert then fails the file is removed.
   */
  async upload(input: UploadVideoInput): Promise<VideoSummary> {
    const key = `videos/${randomUUID()}${extname(input.filename) || '.mp4'}`;
    const { sizeBytes } = await this.storage.save(key, input.file);
    try {
      const row = await this.videoDao.create({
        title: input.title,
        subject: input.subject,
        chapter: input.chapter,
        filePath: key,
        thumbnailUrl: input.thumbnailUrl,
        durationSeconds: input.durationSeconds,
        mimeType: input.mimeType,
        sizeBytes,
      });
      return toSummary(row);
    } catch (error) {
      await this.storage.remove(key).catch(() => undefined);
      throw error;
    }
  }
}
