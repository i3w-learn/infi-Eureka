import { describe, expect, it } from 'vitest';
import type { ContentItem } from '../sample-content';
import { bookMeta, bookPath, filterBooks, findBook, groupIntoBooks } from '../libraryBooks';

const doc = (overrides: Partial<ContentItem> & { id: string }): ContentItem => ({
  title: overrides.id,
  subject: 'biology',
  classLabel: 'Class 12',
  grade: 12,
  meta: '',
  ...overrides,
});

/** Free-sample-first, the order GET /library actually returns. */
const HIGHLIGHTS: ContentItem[] = [
  doc({ id: 'b11-c3', grade: 11, classLabel: 'Class 11', chapterNumber: 3, free: true }),
  doc({ id: 'b12-c2', chapterNumber: 2 }),
  doc({ id: 'b12-c1', chapterNumber: 1 }),
  doc({ id: 'b11-c1', grade: 11, classLabel: 'Class 11', chapterNumber: 1 }),
];

const ids = (items: ContentItem[]) => items.map((i) => i.id);

describe('groupIntoBooks', () => {
  it('makes one book per subject and class', () => {
    const books = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');
    expect(books.map((b) => b.key)).toEqual([
      'ncert_highlight:biology:11',
      'ncert_highlight:biology:12',
    ]);
  });

  it('puts a book back in chapter order, undoing the free-sample-first list', () => {
    const [class11, class12] = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');
    expect(ids(class11!.chapters)).toEqual(['b11-c1', 'b11-c3']);
    expect(ids(class12!.chapters)).toEqual(['b12-c1', 'b12-c2']);
  });

  it('falls back to title order for sheets, which carry no chapter number', () => {
    const sheets = [doc({ id: 's2', title: 'Ecosystem' }), doc({ id: 's1', title: 'Evolution' })];
    const [book] = groupIntoBooks(sheets, 'formula_sheet');
    expect(ids(book!.chapters)).toEqual(['s2', 's1']);
  });

  it('counts the contents with the noun that kind uses', () => {
    const [, class12] = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');
    expect(class12!.meta).toBe('2 chapters');
    expect(groupIntoBooks([doc({ id: 's1' })], 'formula_sheet')[0]!.meta).toBe('1 sheet');
  });

  it('counts the free samples a book holds, leaving the wording to the card', () => {
    const [class11, class12] = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');
    expect(class11!.freeCount).toBe(1);
    expect(class12!.freeCount).toBe(0);
    expect(class11!.meta).toBe('2 chapters');
  });

  it('sorts by class, then subject', () => {
    const mixed = [
      doc({ id: 'chem12', subject: 'chemistry' }),
      doc({ id: 'bio12' }),
      doc({ id: 'chem11', subject: 'chemistry', grade: 11 }),
    ];
    expect(groupIntoBooks(mixed, 'formula_sheet').map((b) => b.key)).toEqual([
      'formula_sheet:chemistry:11',
      'formula_sheet:biology:12',
      'formula_sheet:chemistry:12',
    ]);
  });

  it('finds the cover art a book has, and reports none for one without', () => {
    const [class11, class12] = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');
    expect(class11!.coverUrl).toBe(
      'https://storage.googleapis.com/neetflix-pdf-media/cardImage/paid/11th%20BIOLOGY%20NCERT%20Highlights.webp',
    );
    expect(class12!.coverUrl).toContain('12th%20BIOLOGY%20NCERT%20Highlights.webp');
    expect(groupIntoBooks([doc({ id: 'p11', subject: 'physics', grade: 11 })], 'formula_sheet')[0]!.coverUrl).toBeNull();
  });

  it('leaves out anything with no class, which belongs to no book', () => {
    expect(groupIntoBooks([doc({ id: 'x', grade: null })], 'formula_sheet')).toEqual([]);
  });
});

describe('filterBooks', () => {
  const books = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');

  it('narrows to one book by subject and class together', () => {
    expect(filterBooks(books, { subject: 'biology', grade: 12 }).map((b) => b.key)).toEqual([
      'ncert_highlight:biology:12',
    ]);
  });

  it('returns nothing for a subject this shelf does not carry', () => {
    expect(filterBooks(books, { subject: 'physics', grade: 'all' })).toEqual([]);
  });
});

describe('findBook', () => {
  const books = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');

  it('matches the class from the URL, which arrives as a string', () => {
    expect(findBook(books, 'biology', '11')?.key).toBe('ncert_highlight:biology:11');
  });

  it('is null when the URL names no book we have', () => {
    expect(findBook(books, 'physics', '11')).toBeNull();
  });
});

describe('bookPath', () => {
  it('hangs the book off its catalogue', () => {
    expect(bookPath('/ncert-highlights', { subject: 'biology', grade: 12 })).toBe(
      '/ncert-highlights/biology/12',
    );
  });
});

describe('bookMeta', () => {
  const [class11, class12] = groupIntoBooks(HIGHLIGHTS, 'ncert_highlight');

  it('adds the free count for a student who has not paid', () => {
    expect(bookMeta(class11!, false)).toBe('2 chapters · 1 free');
  });

  it('leaves it off once they have', () => {
    expect(bookMeta(class11!, true)).toBe('2 chapters');
  });

  it('leaves it off for a book holding no free sample', () => {
    expect(bookMeta(class12!, false)).toBe('2 chapters');
  });
});
