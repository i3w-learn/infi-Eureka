import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { VideoService } from '../../src/services/video-service.js';
import { NotFoundError, UnauthenticatedError, ValidationError } from '../../src/exceptions/app-error.js';
import type { CreateVideoInput, IVideoDao } from '../../src/dao/interfaces/video-dao.interface.js';
import type { ByteRange, IStorage, StoredFileStat } from '../../src/integrations/storage/storage.interface.js';
import type { VideoRow } from '../../src/models/video.js';
import { createStreamToken } from '../../src/utils/token.js';

const linkVideo: VideoRow = {
  id: 'video-link',
  title: 'Physics One Shot',
  subject: 'physics',
  chapter: 'Kinematics',
  file_path: null,
  external_url: 'https://videos.example.com/physics-one-shot.mp4',
  thumbnail_url: null,
  duration_seconds: 5400,
  mime_type: 'video/mp4',
  size_bytes: '0',
  created_at: '2026-01-01T00:00:00Z',
};

const fileVideo: VideoRow = {
  ...linkVideo,
  id: 'video-file',
  file_path: 'videos/stored.mp4',
  external_url: null,
};

class FakeVideoDao implements IVideoDao {
  created: CreateVideoInput[] = [];

  async list(): Promise<VideoRow[]> {
    return [linkVideo, fileVideo];
  }

  async findById(id: string): Promise<VideoRow | null> {
    return [linkVideo, fileVideo].find((v) => v.id === id) ?? null;
  }

  async create(input: CreateVideoInput): Promise<VideoRow> {
    this.created.push(input);
    return { ...linkVideo, id: 'new-video', external_url: input.externalUrl ?? null };
  }
}

class FakeStorage implements IStorage {
  async save(): Promise<StoredFileStat> {
    return { sizeBytes: 1000 };
  }
  async stat(): Promise<StoredFileStat | null> {
    return { sizeBytes: 1000 };
  }
  createReadStream(_key: string, _range?: ByteRange): Readable {
    return Readable.from(['bytes']);
  }
  async remove(): Promise<void> {}
}

function service(dao = new FakeVideoDao()): VideoService {
  return new VideoService(dao, new FakeStorage());
}

describe('VideoService — external link videos', () => {
  it('marks each catalogue entry with its source kind', async () => {
    const list = await service().list();
    expect(list.find((v) => v.id === 'video-link')?.sourceKind).toBe('link');
    expect(list.find((v) => v.id === 'video-file')?.sourceKind).toBe('file');
  });

  it('watch hands back the link for an external video', async () => {
    const source = await service().watch('user-1', 'video-link');
    expect(source).toEqual({ kind: 'link', url: linkVideo.external_url });
  });

  it('watch hands back a stream token for a self-hosted video', async () => {
    const source = await service().watch('user-1', 'video-file');
    expect(source.kind).toBe('stream');
    if (source.kind === 'stream') expect(source.expiresIn).toBe(300);
  });

  it('watch on a missing video is a 404', async () => {
    await expect(service().watch('user-1', 'ghost')).rejects.toThrow(NotFoundError);
  });

  it('refuses a stream token for a link video', async () => {
    await expect(service().issueStreamToken('user-1', 'video-link')).rejects.toThrow(ValidationError);
  });

  it('refuses to open a byte stream for a link video', async () => {
    const token = createStreamToken('user-1', 'video-link');
    await expect(service().openStream('video-link', token)).rejects.toThrow(ValidationError);
  });

  it('rejects a stream token issued for a different video', async () => {
    const token = createStreamToken('user-1', 'video-link');
    await expect(service().openStream('video-file', token)).rejects.toThrow(UnauthenticatedError);
  });

  it('streams a self-hosted video with a matching token', async () => {
    const token = createStreamToken('user-1', 'video-file');
    const stream = await service().openStream('video-file', token, 'bytes=0-99');
    expect(stream.range).toEqual({ start: 0, end: 99 });
    expect(stream.sizeBytes).toBe(1000);
  });

  it('addByLink stores the URL, no file involved', async () => {
    const dao = new FakeVideoDao();
    const video = await service(dao).addByLink({
      title: 'Chemistry One Shot',
      subject: 'chemistry',
      chapter: 'Equilibrium',
      externalUrl: 'https://videos.example.com/chem.mp4',
    });

    expect(video.sourceKind).toBe('link');
    expect(dao.created[0]!.externalUrl).toBe('https://videos.example.com/chem.mp4');
    expect(dao.created[0]!.filePath).toBeUndefined();
  });
});
