import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookRow } from '../components/BookRow';
import { ContentRow } from '../components/ContentRow';
import { groupIntoBooks } from '../lib/libraryBooks';
import { formatPaise } from '../api/payments.api';
import { useActivePlan } from '../hooks/useActivePlan';
import { useAuth } from '../hooks/useAuth';
import { useMockTests } from '../hooks/useMockTests';
import { useLibrary } from '../hooks/useLibrary';
import { useVideos } from '../hooks/useVideos';

/**
 * The logged-in home: content shelves, browsable by everyone. One item per
 * shelf is free; the rest unlock with payment.
 *
 * Every shelf comes from the real API: it shows the first few and "View all"
 * opens the whole catalogue.
 */

/** A shelf teases; the catalogue lists. Anything past this needs "View all". */
const SHELF_LIMIT = 5;
const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function DashboardPage() {
  const { user, isPremium } = useAuth();
  const { plan } = useActivePlan();
  const { items: tests } = useMockTests();
  const { items: videos } = useVideos();
  const { items: formulaSheets } = useLibrary('formula_sheet');
  const { items: ncertHighlights } = useLibrary('ncert_highlight');
  const firstName = (user?.name ?? 'Student').split(' ')[0];

  // The library shelves show books, matching their catalogues — a student
  // picks up "Class 12 Biology", not chapter 7 of it.
  const formulaBooks = useMemo(
    () => groupIntoBooks(formulaSheets ?? [], 'formula_sheet'),
    [formulaSheets],
  );
  const ncertBooks = useMemo(
    () => groupIntoBooks(ncertHighlights ?? [], 'ncert_highlight'),
    [ncertHighlights],
  );

  return (
    <div className="w-full">
      <motion.div
        className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        <motion.h1
          variants={rise}
          className="mt-4 font-display text-[1.9rem] leading-tight font-extrabold tracking-tight sm:text-[2.3rem]"
        >
          Hello, {firstName}.
        </motion.h1>
        <motion.p variants={rise} className="mt-2 text-[1.02rem] text-ink-soft">
          {isPremium
            ? 'Everything is unlocked. Pick up where you left off.'
            : 'Start with anything marked Free — one payment unlocks the rest.'}
        </motion.p>

        {/* Unlock banner — gone the moment they pay. */}
        {!isPremium ? (
          <motion.div
            variants={rise}
            className="banner-sheen relative mt-7 overflow-hidden rounded-3xl bg-plum p-6 sm:p-8"
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(120% 100% at 85% -10%, #74498d 0%, #4c2a5e 45%, #2a1340 100%)',
              }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="font-display text-[1.3rem] leading-snug font-bold text-white sm:text-[1.5rem]">
                  Unlock every video, note and mock test.
                </p>
                <p className="mt-1 text-sm text-white/60">One payment, yours until the exam. No subscription.</p>
              </div>
              <div className="flex items-center gap-5">
                {plan ? (
                  <p className="text-white/85">
                    {plan.mrpPaise > plan.pricePaise ? (
                      <s className="text-white/45">{formatPaise(plan.mrpPaise)}</s>
                    ) : null}{' '}
                    <span className="font-display text-[1.7rem] font-extrabold">
                      {formatPaise(plan.pricePaise)}
                    </span>
                  </p>
                ) : null}
                <Link
                  to="/unlock"
                  className="group flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-6 py-3 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(239,113,38,0.75)] transition-all hover:-translate-y-0.5"
                >
                  Unlock everything
                  <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Content shelves */}
        <motion.div variants={rise}>
          <ContentRow
            title="One-shot videos"
            viewAllTo="/videos"
            items={(videos ?? []).slice(0, SHELF_LIMIT)}
            kind="video"
            isPremium={isPremium}
            itemTo={(item) => `/videos/${item.id}`}
          />
        </motion.div>

        <motion.div variants={rise}>
          <BookRow
            title="Formula sheets"
            viewAllTo="/formula-sheets"
            books={formulaBooks.slice(0, SHELF_LIMIT)}
            isPremium={isPremium}
          />
        </motion.div>

        <motion.div variants={rise}>
          <BookRow
            title="NCERT highlights"
            viewAllTo="/ncert-highlights"
            books={ncertBooks.slice(0, SHELF_LIMIT)}
            isPremium={isPremium}
          />
        </motion.div>

        <motion.div variants={rise}>
          <ContentRow
            title="CBT mock tests"
            viewAllTo="/mock-tests"
            items={(tests ?? []).slice(0, SHELF_LIMIT)}
            kind="test"
            isPremium={isPremium}
          />
        </motion.div>

        <motion.p variants={rise} className="mt-10 text-center text-sm text-ink-faint">
          NEET: 720 marks · Physics 180 · Chemistry 180 · Biology 360
        </motion.p>
      </motion.div>
    </div>
  );
}
