import { apiRequest } from './client';

/**
 * The one-shot lecture API. Mirrors backend/src/types/video-schemas.ts.
 *
 * Browsing needs only a login — an unpaid student sees the whole catalogue so
 * they know what they would be buying. Playing needs payment, except the one
 * lecture flagged as the free sample.
 */
export interface VideoSummary {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  /** 'link' plays from an external URL; 'file' streams from our storage. */
  sourceKind: 'youtube' | 'link' | 'file';
  /** 11 or 12; null for a lecture spanning both. */
  grade: number | null;
  educatorName: string | null;
  /** Playable without paying. Exactly one video carries this. */
  isFreeSample: boolean;
}

/** How to actually play it, once access is granted. */
export type WatchSource =
  | { kind: 'youtube'; videoId: string; embedUrl: string }
  | { kind: 'link'; url: string }
  | { kind: 'stream'; token: string; expiresIn: number };

export const videosApi = {
  list: (subject?: string) =>
    apiRequest<VideoSummary[]>(subject ? `/videos?subject=${encodeURIComponent(subject)}` : '/videos'),

  get: (id: string) => apiRequest<VideoSummary>(`/videos/${id}`),

  watch: (id: string) => apiRequest<WatchSource>(`/videos/${id}/watch`),
};
