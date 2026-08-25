import type { ContentItem, Subject } from './sample-content';

/**
 * The two filters on every catalogue page, and how they combine. Pure, so
 * the rules are unit-tested rather than clicked through.
 */
export type SubjectFilter = 'all' | 'biology' | 'physics' | 'chemistry';
export type GradeFilter = 'all' | number;

export interface CatalogFilter {
  subject: SubjectFilter;
  grade: GradeFilter;
}

/**
 * NEET splits Biology into Botany and Zoology and the cards are tagged that
 * way, but a student thinks "Biology" — so that chip covers all three.
 */
const SUBJECT_GROUPS: Record<Exclude<SubjectFilter, 'all'>, readonly Subject[]> = {
  biology: ['biology', 'botany', 'zoology'],
  physics: ['physics'],
  chemistry: ['chemistry'],
};

/** The subject chips, in the order they are drawn. */
export const SUBJECT_FILTERS: { value: SubjectFilter; label: string }[] = [
  { value: 'all', label: 'All subjects' },
  { value: 'biology', label: 'Biology' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
];

/** Whether one subject falls under a chip. Shared by the catalogues and the shelves. */
export function matchesSubjectFilter(subject: Subject, filter: SubjectFilter): boolean {
  return filter === 'all' || SUBJECT_GROUPS[filter].includes(subject);
}

export function filterCatalog(items: ContentItem[], filter: CatalogFilter): ContentItem[] {
  return items.filter((item) => {
    // An item with no class (a lecture spanning both years) only appears
    // when no class is chosen — it belongs to neither Class 11 nor 12 alone.
    const gradeOk = filter.grade === 'all' || item.grade === filter.grade;
    return matchesSubjectFilter(item.subject, filter.subject) && gradeOk;
  });
}

/** The classes this catalogue actually has, so the chips never lead to an empty grid. */
export function availableGrades(items: readonly { grade: number | null }[]): number[] {
  const grades = new Set<number>();
  for (const item of items) {
    if (item.grade !== null) grades.add(item.grade);
  }
  return [...grades].sort((a, b) => a - b);
}
