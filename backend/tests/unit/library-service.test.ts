import { describe, expect, it } from 'vitest';
import { LibraryService } from '../../src/services/library-service.js';
import { NotFoundError } from '../../src/exceptions/app-error.js';
import type { ILibraryDao, LibraryFilter } from '../../src/dao/interfaces/library-dao.interface.js';
import type { LibraryDocumentRow } from '../../src/models/library.js';

function row(overrides: Partial<LibraryDocumentRow> = {}): LibraryDocumentRow {
  return {
    id: 'doc-1',
    kind: 'formula_sheet',
    slug: 'biology-class-12-ecosystem',
    title: 'Ecosystem',
    subject: 'biology',
    grade: 12,
    chapter_number: null,
    url: 'https://storage.googleapis.com/bucket/Ecosystem.pdf',
    size_bytes: '2797117',
    is_free_sample: false,
    created_at: '2026-08-22T00:00:00Z',
    ...overrides,
  };
}

class FakeLibraryDao implements ILibraryDao {
  lastFilter: LibraryFilter | null = null;

  constructor(private readonly rows: LibraryDocumentRow[]) {}

  async list(filter: LibraryFilter): Promise<LibraryDocumentRow[]> {
    this.lastFilter = filter;
    return this.rows.filter(
      (r) =>
        r.kind === filter.kind &&
        (filter.subject === undefined || r.subject === filter.subject) &&
        (filter.grade === undefined || r.grade === filter.grade),
    );
  }

  async findById(id: string): Promise<LibraryDocumentRow | null> {
    return this.rows.find((r) => r.id === id) ?? null;
  }

  async isFreeSample(id: string): Promise<boolean> {
    return this.rows.find((r) => r.id === id)?.is_free_sample ?? false;
  }
}

describe('LibraryService', () => {
  const rows = [
    row({ id: 'fs-1', is_free_sample: true }),
    row({ id: 'fs-2', subject: 'physics', slug: 'physics-class-12-optics', title: 'Ray Optics' }),
    row({
      id: 'nh-1',
      kind: 'ncert_highlight',
      subject: 'biology',
      grade: 11,
      chapter_number: 1,
      title: 'The Living world',
      slug: 'biology-class-11-ch-1-the-living-world',
    }),
  ];

  it('never puts the PDF link in the catalogue', async () => {
    const list = await new LibraryService(new FakeLibraryDao(rows)).list({ kind: 'formula_sheet' });

    expect(list).toHaveLength(2);
    expect(JSON.stringify(list)).not.toContain('storage.googleapis.com');
    expect(list[0]).not.toHaveProperty('url');
  });

  it('separates the two kinds', async () => {
    const service = new LibraryService(new FakeLibraryDao(rows));

    expect(await service.list({ kind: 'formula_sheet' })).toHaveLength(2);
    const highlights = await service.list({ kind: 'ncert_highlight' });
    expect(highlights).toHaveLength(1);
    expect(highlights[0]!.chapterNumber).toBe(1);
  });

  it('passes subject and grade filters through to the query', async () => {
    const dao = new FakeLibraryDao(rows);
    const list = await new LibraryService(dao).list({ kind: 'formula_sheet', subject: 'physics' });

    expect(dao.lastFilter).toEqual({ kind: 'formula_sheet', subject: 'physics' });
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('Ray Optics');
  });

  it('marks the free sample so the catalogue can badge it', async () => {
    const list = await new LibraryService(new FakeLibraryDao(rows)).list({ kind: 'formula_sheet' });
    expect(list.filter((d) => d.isFreeSample)).toHaveLength(1);
  });

  it('opening a document returns the link', async () => {
    const detail = await new LibraryService(new FakeLibraryDao(rows)).open('fs-1');
    expect(detail.url).toBe('https://storage.googleapis.com/bucket/Ecosystem.pdf');
  });

  it('opening a missing document is a 404', async () => {
    await expect(new LibraryService(new FakeLibraryDao(rows)).open('ghost')).rejects.toThrow(NotFoundError);
  });

  it('converts BIGINT size to a number', async () => {
    const detail = await new LibraryService(new FakeLibraryDao(rows)).open('fs-1');
    expect(detail.sizeBytes).toBe(2797117);
  });
});
