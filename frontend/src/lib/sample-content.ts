/**
 * The shape every content card is fed, whatever it is showing.
 *
 * Videos, notes, mock tests and library documents all arrive from different
 * endpoints in different shapes; each hook maps its response into this one
 * type so a single card, row and catalogue can render all four.
 */
// NEET splits Biology into Botany and Zoology, and students pick lectures by
// that split, so both are first-class rather than folded into 'biology'.
export type Subject = 'biology' | 'botany' | 'zoology' | 'physics' | 'chemistry' | 'mixed';

/** How each subject is written wherever a student reads it. */
export const SUBJECT_LABELS: Record<Subject, string> = {
  biology: 'Biology',
  botany: 'Botany',
  zoology: 'Zoology',
  physics: 'Physics',
  chemistry: 'Chemistry',
  mixed: 'All subjects',
};

export interface ContentItem {
  id: string;
  title: string;
  subject: Subject;
  classLabel: string;
  /** 11 or 12; null for content that spans both years. Drives the class filter. */
  grade: number | null;
  /** Cover image. Absent for content that has none — the card falls back to
      its subject colour. */
  thumbnailUrl?: string | null;
  /** Chapter this belongs to, for library documents that carry one. Orders a
      book's contents, which the API returns free-sample-first. */
  chapterNumber?: number | null;
  /** One line under the title: duration, pages, or question count. */
  meta: string;
  /** First item in each row is open to everyone — the taste that sells. */
  free?: boolean;
}
