import type { ILibraryDao } from '../dao/interfaces/library-dao.interface.js';
import type { LibraryDocumentRow, LibraryKind } from '../models/library.js';
import { NotFoundError } from '../exceptions/app-error.js';

/** What the catalogue shows. Deliberately no `url` — see `open()`. */
export interface LibraryDocumentSummary {
  id: string;
  slug: string;
  title: string;
  subject: string;
  grade: number;
  chapterNumber: number | null;
  sizeBytes: number;
  isFreeSample: boolean;
}

/** What opening a document returns: the summary plus the PDF link. */
export interface LibraryDocumentDetail extends LibraryDocumentSummary {
  url: string;
}

export interface ListLibraryInput {
  kind: LibraryKind;
  subject?: string | undefined;
  grade?: number | undefined;
}

function toSummary(row: LibraryDocumentRow): LibraryDocumentSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    chapterNumber: row.chapter_number,
    sizeBytes: Number(row.size_bytes),
    isFreeSample: row.is_free_sample,
  };
}

/**
 * The PDF study library: formula sheets and NCERT Highlights.
 *
 * The catalogue is browsable by anyone signed in, but the PDF link comes only
 * from `open()`, which routes gate on payment. That split is the whole paywall
 * for this feature: a locked student sees every title and can open the one
 * free sample, and nothing else.
 */
export class LibraryService {
  constructor(private readonly libraryDao: ILibraryDao) {}

  async list(input: ListLibraryInput): Promise<LibraryDocumentSummary[]> {
    const rows = await this.libraryDao.list(input);
    return rows.map(toSummary);
  }

  async open(id: string): Promise<LibraryDocumentDetail> {
    const row = await this.libraryDao.findById(id);
    if (!row) throw new NotFoundError('This document does not exist.');
    return { ...toSummary(row), url: row.url };
  }
}
