import { beforeEach, describe, expect, it } from 'vitest';
import { NoteService } from '../../src/services/note-service.js';
import { NotFoundError } from '../../src/exceptions/app-error.js';
import type { INoteDao } from '../../src/dao/interfaces/note-dao.interface.js';
import type {
  CreateHighlightInput,
  IHighlightDao,
} from '../../src/dao/interfaces/highlight-dao.interface.js';
import type { HighlightRow, NoteRow } from '../../src/models/note.js';

const note: NoteRow = {
  id: 'note-1',
  title: 'Cell Structure',
  subject: 'biology',
  chapter: 'Cell',
  content_html: '<h2>Cells</h2><p>Fine content</p><script>alert("xss")</script><img src="x" onerror="steal()">',
  created_at: '2026-01-01T00:00:00Z',
};

class FakeNoteDao implements INoteDao {
  async list(): Promise<Omit<NoteRow, 'content_html'>[]> {
    return [note];
  }
  async findById(id: string): Promise<NoteRow | null> {
    return id === note.id ? note : null;
  }
}

class FakeHighlightDao implements IHighlightDao {
  rows = new Map<string, HighlightRow>();
  private nextId = 1;

  async listForUserAndNote(userId: string, noteId: string): Promise<HighlightRow[]> {
    return [...this.rows.values()].filter((r) => r.user_id === userId && r.note_id === noteId);
  }

  async create(input: CreateHighlightInput): Promise<HighlightRow> {
    const row: HighlightRow = {
      id: `h${this.nextId++}`,
      user_id: input.userId,
      note_id: input.noteId,
      highlighted_text: input.highlightedText,
      start_offset: input.startOffset,
      end_offset: input.endOffset,
      created_at: new Date().toISOString(),
    };
    this.rows.set(row.id, row);
    return row;
  }

  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const row = this.rows.get(id);
    if (!row || row.user_id !== userId) return false;
    this.rows.delete(id);
    return true;
  }
}

describe('NoteService', () => {
  let highlightDao: FakeHighlightDao;
  let service: NoteService;

  beforeEach(() => {
    highlightDao = new FakeHighlightDao();
    service = new NoteService(new FakeNoteDao(), highlightDao);
  });

  it('strips scripts and event handlers from note HTML (NFR-S-10)', async () => {
    const detail = await service.get('note-1');

    expect(detail.contentHtml).toContain('<h2>Cells</h2>');
    expect(detail.contentHtml).not.toContain('<script');
    expect(detail.contentHtml).not.toContain('onerror');
    expect(detail.contentHtml).not.toContain('alert');
  });

  it('each user sees only their own highlights (FR-N-06)', async () => {
    await service.createHighlight('asha', 'note-1', { highlightedText: 'Cells', startOffset: 0, endOffset: 5 });
    await service.createHighlight('vikram', 'note-1', { highlightedText: 'Fine', startOffset: 9, endOffset: 13 });

    const ashas = await service.listHighlights('asha', 'note-1');
    expect(ashas).toHaveLength(1);
    expect(ashas[0]!.highlightedText).toBe('Cells');
  });

  it("deleting someone else's highlight is a 404, not a 403 (FR-N-08)", async () => {
    const mine = await service.createHighlight('asha', 'note-1', {
      highlightedText: 'Cells',
      startOffset: 0,
      endOffset: 5,
    });

    await expect(service.deleteHighlight('vikram', mine.id)).rejects.toThrow(NotFoundError);
    expect(highlightDao.rows.has(mine.id)).toBe(true);

    await service.deleteHighlight('asha', mine.id);
    expect(highlightDao.rows.has(mine.id)).toBe(false);
  });

  it('a highlight on a missing note is a 404', async () => {
    await expect(
      service.createHighlight('asha', 'ghost', { highlightedText: 'x', startOffset: 0, endOffset: 1 }),
    ).rejects.toThrow(NotFoundError);
  });
});
