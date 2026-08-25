import type { LibraryKind } from '../api/library.api';
import { matchesSubjectFilter, type GradeFilter, type SubjectFilter } from './catalogFilter';
import { mediaUrl } from './media';
import { SUBJECT_LABELS, type ContentItem, type Subject } from './sample-content';

/**
 * A *book*: every library document of one kind, for one subject and one class.
 * "Class 12 Biology formula sheets" is one book of thirteen sheets.
 *
 * The API hands back a flat list of documents, which is the right shape for
 * the reader but the wrong one for browsing: a student picking Biology + Class
 * 12 is reaching for a book, not for chapter 7. So the shelf groups the list
 * into books and shows each one under the cover of the physical book it comes
 * from; opening a book is what reveals its chapters.
 */

/**
 * Cover art per book, keyed by `kind:subject:grade`, as paths under the media
 * bucket's cover folder.
 *
 * A book with no entry here still works; its card falls back to the subject
 * colour, the same as any other coverless card.
 */
const COVER_PATHS: Record<string, string> = {
  'formula_sheet:chemistry:11': 'formula-sheet/grade-11/chemistry/11th CHEMISTRY FORMULA SHEETS.webp',
  'formula_sheet:biology:12': 'formula-sheet/grade-12/biology/12th BIOLOGY FORMULA SHEETS.png',
  'formula_sheet:chemistry:12': 'formula-sheet/grade-12/chemistry/12th CHEMISTRY FORMULA SHEETS.webp',
  'formula_sheet:physics:12': 'formula-sheet/grade-12/physics/12th PHYSICS FORMULA SHEETS.png',
  'ncert_highlight:biology:11': 'paid/11th BIOLOGY NCERT Highlights.webp',
  'ncert_highlight:biology:12': 'paid/12th BIOLOGY NCERT Highlights.webp',
};

/** What one book's contents are called, so the count line reads naturally. */
const UNIT_NOUN: Record<LibraryKind, [singular: string, plural: string]> = {
  formula_sheet: ['sheet', 'sheets'],
  ncert_highlight: ['chapter', 'chapters'],
};

/** Subjects in the order the shelf lists them — the order of the filter chips. */
const SUBJECT_ORDER: Subject[] = ['biology', 'botany', 'zoology', 'physics', 'chemistry', 'mixed'];

export interface LibraryBook {
  /** `kind:subject:grade` — unique per shelf, and the React key. */
  key: string;
  kind: LibraryKind;
  subject: Subject;
  grade: number;
  /** "Class 12 Biology" — what the card is called. */
  title: string;
  /** "Class 12" — the pill on the cover. */
  classLabel: string;
  /** "13 chapters" — the free count is the card's to add, since a paid
      student has no use for it. */
  meta: string;
  coverUrl: string | null;
  /** The documents inside, in chapter order. */
  chapters: ContentItem[];
  /** How many of them a student can open without paying. */
  freeCount: number;
}

/**
 * The count line a card shows. What a locked student gets for free is the
 * pitch; a paid one is already past it, so that half stays off their card.
 */
export function bookMeta(book: LibraryBook, isPremium: boolean): string {
  return !isPremium && book.freeCount > 0 ? `${book.meta} · ${book.freeCount} free` : book.meta;
}

/** The book's own URL under a catalogue, e.g. `/formula-sheets/biology/12`. */
export function bookPath(detailBase: string, book: Pick<LibraryBook, 'subject' | 'grade'>): string {
  return `${detailBase}/${book.subject}/${book.grade}`;
}

function coverUrl(key: string): string | null {
  const path = COVER_PATHS[key];
  return path === undefined ? null : mediaUrl(`cardImage/${path}`);
}

/**
 * The API orders documents free-sample-first, which is right for a shelf that
 * leads with the free one but wrong inside a book — there, chapter 1 comes
 * first. Sheets carry no chapter number, so they fall back to their title.
 */
function inChapterOrder(a: ContentItem, b: ContentItem): number {
  const left = a.chapterNumber ?? null;
  const right = b.chapterNumber ?? null;
  if (left !== null && right !== null) return left - right;
  if (left !== null) return -1;
  if (right !== null) return 1;
  return a.title.localeCompare(b.title);
}

/** Groups a catalogue's documents into books, in class-then-subject order. */
export function groupIntoBooks(items: ContentItem[], kind: LibraryKind): LibraryBook[] {
  const [singular, plural] = UNIT_NOUN[kind];
  const byKey = new Map<string, ContentItem[]>();

  for (const item of items) {
    // Library documents always carry a class; anything else has no book to
    // belong to, so it is left out rather than shelved under a made-up one.
    if (item.grade === null) continue;
    const key = `${kind}:${item.subject}:${item.grade}`;
    const chapters = byKey.get(key);
    if (chapters) chapters.push(item);
    else byKey.set(key, [item]);
  }

  const books: LibraryBook[] = [];
  for (const [key, chapters] of byKey) {
    const first = chapters[0];
    if (first === undefined || first.grade === null) continue;
    const freeCount = chapters.filter((chapter) => chapter.free).length;

    books.push({
      key,
      kind,
      subject: first.subject,
      grade: first.grade,
      title: `Class ${first.grade} ${SUBJECT_LABELS[first.subject]}`,
      classLabel: `Class ${first.grade}`,
      meta: `${chapters.length} ${chapters.length === 1 ? singular : plural}`,
      coverUrl: coverUrl(key),
      chapters: [...chapters].sort(inChapterOrder),
      freeCount,
    });
  }

  return books.sort(
    (a, b) =>
      a.grade - b.grade || SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject),
  );
}

/** The same subject and class chips as the catalogues, applied to books. */
export function filterBooks(
  books: LibraryBook[],
  filter: { subject: SubjectFilter; grade: GradeFilter },
): LibraryBook[] {
  return books.filter(
    (book) =>
      matchesSubjectFilter(book.subject, filter.subject) &&
      (filter.grade === 'all' || book.grade === filter.grade),
  );
}

/** The one book a URL like `/formula-sheets/biology/12` names, if it exists. */
export function findBook(books: LibraryBook[], subject: string, grade: string): LibraryBook | null {
  return books.find((book) => book.subject === subject && String(book.grade) === grade) ?? null;
}
