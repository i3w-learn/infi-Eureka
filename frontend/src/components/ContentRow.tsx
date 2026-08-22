import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ContentCard, type ContentKind } from './ContentCard';
import type { ContentItem } from '../lib/sample-content';

/**
 * A horizontal shelf of content cards: section heading, "View all", and a
 * scrollable row. The cards themselves live in ContentCard, shared with the
 * catalogue grids.
 */
interface ContentRowProps {
  title: string;
  viewAllTo: string;
  items: ContentItem[];
  kind: ContentKind;
  /** Paid user — no locks anywhere. */
  isPremium: boolean;
  /**
   * Where an unlocked card leads. Without it a card just opens the catalogue,
   * which is right for sections whose detail page does not exist yet. Locked
   * cards always go to /unlock regardless.
   */
  itemTo?: (item: ContentItem) => string;
}

export function ContentRow({ title, viewAllTo, items, kind, isPremium, itemTo }: ContentRowProps) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[1.35rem] font-bold tracking-tight">{title}</h2>
        <Link
          to={viewAllTo}
          className="text-sm font-medium text-plum underline underline-offset-4 transition-colors hover:text-marigold"
        >
          View all
        </Link>
      </div>

      <div className="-mx-1 mt-4 flex snap-x gap-4 overflow-x-auto px-1 pb-3">
        {items.map((item, index) => {
          const locked = !isPremium && !item.free;
          return (
            <motion.div
              key={item.id}
              className="snap-start self-stretch"
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, x: 32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <ContentCard
                item={item}
                kind={kind}
                isPremium={isPremium}
                to={locked ? '/unlock' : (itemTo?.(item) ?? viewAllTo)}
                fixedWidth
              />
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
