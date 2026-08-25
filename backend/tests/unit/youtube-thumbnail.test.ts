import { describe, expect, it } from 'vitest';
import { thumbnailFor, youtubeId } from '../../src/services/video-service.js';
import type { VideoRow } from '../../src/models/video.js';

const row = (overrides: Partial<VideoRow>): VideoRow =>
  ({
    id: 'v1',
    title: 'One shot',
    subject: 'botany',
    chapter: 'The Living World',
    file_path: null,
    external_url: null,
    youtube_url: null,
    is_embeddable: true,
    thumbnail_url: null,
    duration_seconds: 3600,
    mime_type: 'video/mp4',
    size_bytes: '0',
    grade: 11,
    educator_name: null,
    is_free_sample: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as VideoRow;

describe('youtubeId', () => {
  it('reads the id out of every URL shape in the catalogue', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for anything that is not a YouTube link', () => {
    expect(youtubeId('https://videos.example.com/lecture.mp4')).toBeNull();
  });
});

describe('thumbnailFor', () => {
  it('derives the YouTube thumbnail when the row has no stored one', () => {
    expect(thumbnailFor(row({ youtube_url: 'https://youtu.be/dQw4w9WgXcQ' }))).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
  });

  it('prefers a stored thumbnail over the derived one', () => {
    expect(
      thumbnailFor(
        row({
          youtube_url: 'https://youtu.be/dQw4w9WgXcQ',
          thumbnail_url: 'https://cdn.example.com/custom.jpg',
        }),
      ),
    ).toBe('https://cdn.example.com/custom.jpg');
  });

  it('derives one even when the video may not be embedded — the image is still public', () => {
    expect(
      thumbnailFor(row({ youtube_url: 'https://youtu.be/dQw4w9WgXcQ', is_embeddable: false })),
    ).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('is null for a self-hosted video with no thumbnail', () => {
    expect(thumbnailFor(row({ file_path: 'videos/stored.mp4' }))).toBeNull();
  });

  it('is null when the YouTube URL is unparseable', () => {
    expect(thumbnailFor(row({ youtube_url: 'https://youtube.com/watch?list=PLabc' }))).toBeNull();
  });
});
