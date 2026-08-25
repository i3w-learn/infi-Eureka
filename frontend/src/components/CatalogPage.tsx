import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ContentCard, cardMotion, cardEntrance, type ContentKind } from './ContentCard';
import { BackButton } from './BackButton';
import { FilterRow, gradeFilterOptions } from './FilterRow';
import { useAuth } from '../hooks/useAuth';
import type { ContentItem } from '../lib/sample-content';
import {
  availableGrades,
  filterCatalog,
  SUBJECT_FILTERS,
  type GradeFilter,
  type SubjectFilter,
} from '../lib/catalogFilter';

/**
 * The "View all" page for a content section: heading, two rows of filter
 * chips (subject, then class), and the full grid. Every section — videos,
 * notes, formula sheets, NCERT highlights — is this one component with
 * different data, so a filter added here reaches all of them.
 *
 * Both filters combine: Physics + Class 12 shows only Class 12 Physics. They
 * default to "All" because the student's class is not known to the frontend.
 */
interface CatalogPageProps {
  title: string;
  subtitle: string;
  /** null while the fetch is in flight — an empty array means genuinely empty. */
  items: ContentItem[] | null;
  kind: ContentKind;
  /** Where an unlocked card leads (detail routes come with their phases). */
  detailBase: string;
  /** Appended after the id — tests link to /mock-tests/:id/attempt. */
  detailSuffix?: string;
}

export function CatalogPage({
  title,
  subtitle,
  items,
  kind,
  detailBase,
  detailSuffix = '',
}: CatalogPageProps) {
  const { isPremium } = useAuth();
  const [subject, setSubject] = useState<SubjectFilter>('all');
  const [grade, setGrade] = useState<GradeFilter>('all');

  // `items ?? []` is a fresh array each render, so it stays inside the memos
  // rather than becoming a dependency that always looks changed.
  const grades = useMemo(() => availableGrades(items ?? []), [items]);
  const visible = useMemo(
    () => filterCatalog(items ?? [], { subject, grade }),
    [items, subject, grade],
  );
  const hasSubjects = (items ?? []).some((item) => item.subject !== 'mixed');

  const gradeFilters = gradeFilterOptions(grades);

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

        {/* Subject chips — hidden when the content is not subject-split. */}
        {hasSubjects ? (
          <FilterRow
            label="Subject"
            delay={0.15}
            options={SUBJECT_FILTERS}
            selected={subject}
            onSelect={setSubject}
          />
        ) : null}

        {/* Class chips — hidden when nothing here carries a class. */}
        {grades.length > 0 ? (
          <FilterRow label="Class" delay={0.2} options={gradeFilters} selected={grade} onSelect={setGrade} />
        ) : null}

        {items === null ? (
          <p className="mt-14 text-center text-ink-faint">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="mt-14 text-center text-ink-faint">
            Nothing here for this class and subject yet. Try another filter.
          </p>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visible.map((item, index) => {
              const locked = !isPremium && !item.free;
              return (
                <cardMotion.div key={item.id} {...cardEntrance(index)} className="self-stretch">
                  <ContentCard
                    item={item}
                    kind={kind}
                    isPremium={isPremium}
                    to={locked ? '/unlock' : `${detailBase}/${item.id}${detailSuffix}`}
                  />
                </cardMotion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

