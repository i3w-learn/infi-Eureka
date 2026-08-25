import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookCard } from './BookCard';
import { cardEntrance, cardMotion } from './ContentCard';
import { BackButton } from './BackButton';
import { FilterRow, gradeFilterOptions } from './FilterRow';
import { useAuth } from '../hooks/useAuth';
import { availableGrades, SUBJECT_FILTERS, type GradeFilter, type SubjectFilter } from '../lib/catalogFilter';
import { bookPath, filterBooks, groupIntoBooks } from '../lib/libraryBooks';
import type { LibraryKind } from '../api/library.api';
import type { ContentItem } from '../lib/sample-content';

/**
 * The "View all" page for a library section — formula sheets, NCERT
 * Highlights. Same heading and filter chips as CatalogPage, but the grid holds
 * books rather than documents: picking Biology + Class 12 lands on one cover,
 * and the chapters are a click further in.
 */
interface BookShelfPageProps {
  title: string;
  subtitle: string;
  /** null while the fetch is in flight — an empty array means genuinely empty. */
  items: ContentItem[] | null;
  kind: LibraryKind;
  /** The section root, e.g. `/formula-sheets`; a book hangs off it. */
  detailBase: string;
}

export function BookShelfPage({ title, subtitle, items, kind, detailBase }: BookShelfPageProps) {
  const { isPremium } = useAuth();
  const [subject, setSubject] = useState<SubjectFilter>('all');
  const [grade, setGrade] = useState<GradeFilter>('all');

  const books = useMemo(() => groupIntoBooks(items ?? [], kind), [items, kind]);
  const grades = useMemo(() => availableGrades(books), [books]);
  const visible = useMemo(() => filterBooks(books, { subject, grade }), [books, subject, grade]);

  return (
    <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
      <div className="w-full">
        {/* This page is reachable from the rail and from a dashboard shelf's
            "View all", so the way back is not always the same place — the
            button follows history and falls back to the dashboard. */}
        <BackButton fallback="/dashboard" />

        <motion.h1
          className="mt-4 font-display text-[1.9rem] leading-tight font-extrabold tracking-tight sm:text-[2.3rem]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {title}
        </motion.h1>
        <motion.p
          className="mt-2 text-[1.02rem] text-ink-soft"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {subtitle}
        </motion.p>

        <FilterRow
          label="Subject"
          delay={0.15}
          options={SUBJECT_FILTERS}
          selected={subject}
          onSelect={setSubject}
        />
        {grades.length > 0 ? (
          <FilterRow
            label="Class"
            delay={0.2}
            options={gradeFilterOptions(grades)}
            selected={grade}
            onSelect={setGrade}
          />
        ) : null}

        {items === null ? (
          <p className="mt-14 text-center text-ink-faint">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="mt-14 text-center text-ink-faint">
            Nothing here for this class and subject yet. Try another filter.
          </p>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visible.map((book, index) => (
              <cardMotion.div key={book.key} {...cardEntrance(index)} className="self-stretch">
                <BookCard book={book} isPremium={isPremium} to={bookPath(detailBase, book)} />
              </cardMotion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
