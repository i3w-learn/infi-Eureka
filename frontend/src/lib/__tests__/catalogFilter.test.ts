import { describe, expect, it } from 'vitest';
import type { ContentItem } from '../sample-content';
import { availableGrades, filterCatalog } from '../catalogFilter';

const item = (overrides: Partial<ContentItem> & { id: string }): ContentItem => ({
  title: overrides.id,
  subject: 'physics',
  classLabel: 'Class 11',
  grade: 11,
  meta: '',
  ...overrides,
});

const ITEMS: ContentItem[] = [
  item({ id: 'bot11', subject: 'botany', grade: 11 }),
  item({ id: 'zoo12', subject: 'zoology', grade: 12 }),
  item({ id: 'bio12', subject: 'biology', grade: 12 }),
  item({ id: 'phy11', subject: 'physics', grade: 11 }),
  item({ id: 'chem-any', subject: 'chemistry', grade: null, classLabel: 'One shot' }),
];

const ids = (items: ContentItem[]) => items.map((i) => i.id);

describe('filterCatalog', () => {
  it('returns everything with both filters on "all"', () => {
    expect(filterCatalog(ITEMS, { subject: 'all', grade: 'all' })).toHaveLength(5);
  });

  it('treats Biology as botany + zoology + biology', () => {
    expect(ids(filterCatalog(ITEMS, { subject: 'biology', grade: 'all' }))).toEqual([
      'bot11',
      'zoo12',
      'bio12',
    ]);
  });

  it('filters by class', () => {
    expect(ids(filterCatalog(ITEMS, { subject: 'all', grade: 12 }))).toEqual(['zoo12', 'bio12']);
  });

  it('combines subject and class', () => {
    expect(ids(filterCatalog(ITEMS, { subject: 'biology', grade: 11 }))).toEqual(['bot11']);
  });

  it('shows items with no class only under "all classes"', () => {
    expect(ids(filterCatalog(ITEMS, { subject: 'chemistry', grade: 11 }))).toEqual([]);
    expect(ids(filterCatalog(ITEMS, { subject: 'chemistry', grade: 'all' }))).toEqual(['chem-any']);
  });
});

describe('availableGrades', () => {
  it('lists the classes present, sorted, ignoring items without one', () => {
    expect(availableGrades(ITEMS)).toEqual([11, 12]);
  });

  it('is empty when nothing carries a class', () => {
    expect(availableGrades([item({ id: 'x', grade: null })])).toEqual([]);
  });
});
