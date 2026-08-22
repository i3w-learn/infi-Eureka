import sanitizeHtml from 'sanitize-html';
import type { INoteDao } from '../dao/interfaces/note-dao.interface.js';
import type { CreateHighlightInput, IHighlightDao } from '../dao/interfaces/highlight-dao.interface.js';
import type { HighlightRow } from '../models/note.js';
import { NotFoundError, ValidationError } from '../exceptions/app-error.js';

export interface NoteSummary {
  id: string;
  title: string;
  subject: string;
  chapter: string;
}

export interface NoteDetail extends NoteSummary {
  contentHtml: string;
}

export interface HighlightView {
  id: string;
  noteId: string;
  highlightedText: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
}

export type NewHighlight = Omit<CreateHighlightInput, 'userId' | 'noteId'>;

// What note content may contain after sanitisation (NFR-S-10). Formatting and
// study material only — no scripts, no event handlers, no iframes.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 'sub', 'sup', 'mark',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'pre', 'code', 'img', 'a',
  ],
  allowedAttributes: {
    img: ['src', 'alt'],
    a: ['href'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
  },
  allowedSchemes: ['https', 'http', 'data'],
};

function toHighlightView(row: HighlightRow): HighlightView {
  return {
    id: row.id,
    noteId: row.note_id,
    highlightedText: row.highlighted_text,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    createdAt: row.created_at,
  };
}

export class NoteService {
  constructor(
    private readonly noteDao: INoteDao,
    private readonly highlightDao: IHighlightDao,
  ) {}

  async list(subject?: string): Promise<NoteSummary[]> {
    const rows = await this.noteDao.list(subject);
    return rows.map((row) => ({ id: row.id, title: row.title, subject: row.subject, chapter: row.chapter }));
  }

  async get(id: string): Promise<NoteDetail> {
    const row = await this.noteDao.findById(id);
    if (!row) throw new NotFoundError('This note does not exist.');
    return {
      id: row.id,
      title: row.title,
      subject: row.subject,
      chapter: row.chapter,
      contentHtml: sanitizeHtml(row.content_html, SANITIZE_OPTIONS),
    };
  }

  async listHighlights(userId: string, noteId: string): Promise<HighlightView[]> {
    if (!(await this.noteDao.findById(noteId))) throw new NotFoundError('This note does not exist.');
    const rows = await this.highlightDao.listForUserAndNote(userId, noteId);
    return rows.map(toHighlightView);
  }

  async createHighlight(userId: string, noteId: string, input: NewHighlight): Promise<HighlightView> {
    const note = await this.noteDao.findById(noteId);
    if (!note) throw new NotFoundError('This note does not exist.');
    if (input.highlightedText.trim() === '') {
      throw new ValidationError('A highlight cannot be empty.');
    }
    const row = await this.highlightDao.create({ ...input, userId, noteId });
    return toHighlightView(row);
  }

  /** "Not yours" and "does not exist" are the same 404 on purpose (FR-N-08). */
  async deleteHighlight(userId: string, highlightId: string): Promise<void> {
    const deleted = await this.highlightDao.deleteOwned(highlightId, userId);
    if (!deleted) throw new NotFoundError('This highlight does not exist.');
  }
}
