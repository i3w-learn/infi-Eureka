import { useState } from 'react';
import { motion } from 'motion/react';
import { ContentCard, cardMotion, cardEntrance, type ContentKind } from './ContentCard';
import { useAuth } from '../hooks/useAuth';
import type { ContentItem, Subject } from '../lib/sample-content';

/**
 * The "View all" page for a content section: heading, subject filter chips,
 * and the full grid. All three sections (videos, notes, tests) are this one
 * component with different data.
 */
const FILTERS: { value: Subject | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'biology', label: 'Biology' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
];

interface CatalogPageProps {
  title: string;
  subtitle: string;
  items: ContentItem[];
  kind: ContentKind;
  /** Where an unlocked card leads (detail routes come with their phases). */
  detailBase: string;
  /** Appended after the id — tests link to /mock-tests/:id/attempt. */
  detailSuffix?: string;
}

export function CatalogPage({ title, subtitle, items, kind, detailBase, detailSuffix = '' }: CatalogPageProps) {
  const { isPremium } = useAuth();
  const [filter, setFilter] = useState<Subject | 'all'>('all');

  const visible = filter === 'all' ? items : items.filter((item) => item.subject === filter);
  const showsMixed = items.some((item) => item.subject === 'mixed');

  return (
    <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
      <div className="w-full">
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

        {/* Subject filter — hidden when the content is not subject-split. */}
        {!showsMixed || items.some((i) => i.subject !== 'mixed') ? (
          <motion.div
            className="mt-6 flex flex-wrap gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            {FILTERS.map(({ value, label }) => {
              const active = filter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-bubble border px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-marigold bg-marigold-wash text-ink'
                      : 'border-paper-edge bg-white text-ink-soft hover:border-ink-faint'
                  }`}
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-bubble ${active ? 'bg-marigold' : 'border border-ink-faint/50'}`}
                  />
                  {label}
                </button>
              );
            })}
          </motion.div>
        ) : null}

        {visible.length === 0 ? (
          <p className="mt-14 text-center text-ink-faint">
            Nothing here for this subject yet. Try another filter.
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
