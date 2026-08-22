/**
 * Placeholder catalogue data so the dashboard shows real-looking rows.
 *
 * TEMPORARY: this file dies the moment the content API exists — the rows will
 * then come from GET /videos, /notes and /tests. Shapes mirror the planned
 * tables so the swap is mechanical.
 */
// NEET splits Biology into Botany and Zoology, and students pick lectures by
// that split, so both are first-class rather than folded into 'biology'.
export type Subject =
  | 'biology'
  | 'botany'
  | 'zoology'
  | 'physics'
  | 'chemistry'
  | 'mixed';

export interface ContentItem {
  id: string;
  title: string;
  subject: Subject;
  classLabel: string;
  /** One line under the title: duration, pages, or question count. */
  meta: string;
  /** First item in each row is open to everyone — the taste that sells. */
  free?: boolean;
}

export const SAMPLE_VIDEOS: ContentItem[] = [
  { id: 'v1', title: 'Cell: The Unit of Life — one shot', subject: 'biology', classLabel: 'Class 11', meta: '2h 40m', free: true },
  { id: 'v2', title: 'Laws of Motion — one shot', subject: 'physics', classLabel: 'Class 11', meta: '3h 05m' },
  { id: 'v3', title: 'Chemical Bonding — one shot', subject: 'chemistry', classLabel: 'Class 11', meta: '2h 55m' },
  { id: 'v4', title: 'Human Physiology — one shot', subject: 'biology', classLabel: 'Class 12', meta: '3h 20m' },
  { id: 'v5', title: 'Electrostatics — one shot', subject: 'physics', classLabel: 'Class 12', meta: '2h 50m' },
  { id: 'v6', title: 'GOC: Organic Basics — one shot', subject: 'chemistry', classLabel: 'Class 11', meta: '3h 10m' },
];

export const SAMPLE_NOTES: ContentItem[] = [
  { id: 'n1', title: 'Cell Biology — complete notes', subject: 'biology', classLabel: 'Class 11', meta: '24 pages', free: true },
  { id: 'n2', title: 'Thermodynamics — formula notes', subject: 'physics', classLabel: 'Class 11', meta: '16 pages' },
  { id: 'n3', title: 'Periodic Table — trends & tricks', subject: 'chemistry', classLabel: 'Class 11', meta: '12 pages' },
  { id: 'n4', title: 'Genetics — complete notes', subject: 'biology', classLabel: 'Class 12', meta: '28 pages' },
  { id: 'n5', title: 'Optics — ray & wave notes', subject: 'physics', classLabel: 'Class 12', meta: '20 pages' },
];

export const SAMPLE_TESTS: ContentItem[] = [
  { id: 't1', title: 'Full syllabus mock #1', subject: 'mixed', classLabel: 'NEET pattern', meta: '180 Q · 200 min', free: true },
  { id: 't2', title: 'Biology sectional — Botany', subject: 'biology', classLabel: 'NEET pattern', meta: '45 Q · 50 min' },
  { id: 't3', title: 'Physics sectional — Mechanics', subject: 'physics', classLabel: 'NEET pattern', meta: '45 Q · 50 min' },
  { id: 't4', title: 'Chemistry sectional — Organic', subject: 'chemistry', classLabel: 'NEET pattern', meta: '45 Q · 50 min' },
  { id: 't5', title: 'Full syllabus mock #2', subject: 'mixed', classLabel: 'NEET pattern', meta: '180 Q · 200 min' },
];
