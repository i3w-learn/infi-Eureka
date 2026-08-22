import { useEffect, useState } from 'react';
import { videosApi } from '../api/videos.api';
import { ApiError } from '../api/client';
import type { ContentItem, Subject } from '../lib/sample-content';

const KNOWN_SUBJECTS: Subject[] = ['biology', 'physics', 'chemistry', 'botany', 'zoology'];

/** '2h 40m' — the length is the first thing a student weighs before starting. */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'One shot';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * The lecture catalogue, shaped for the shared content cards.
 *
 * One fetch feeds both the dashboard shelf and the full catalogue, so the two
 * can never disagree. `free` mirrors the server's flag rather than "first in
 * the list" — the badge and the gate that actually plays the lecture read the
 * same source.
 */
export function useVideos(): { items: ContentItem[] | null; error?: string } {
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    videosApi
      .list()
      .then((videos) => {
        if (cancelled) return;
        setItems(
          videos.map((video) => ({
            id: video.id,
            title: video.title,
            subject: KNOWN_SUBJECTS.includes(video.subject as Subject)
              ? (video.subject as Subject)
              : 'mixed',
            // Grade is unknown for lectures that span both years; the educator
            // is the more useful label there, since students follow teachers.
            classLabel: video.grade ? `Class ${video.grade}` : (video.educatorName ?? 'One shot'),
            meta: formatDuration(video.durationSeconds),
            free: video.isFreeSample,
          })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load the lectures.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { items, ...(error ? { error } : {}) };
}
