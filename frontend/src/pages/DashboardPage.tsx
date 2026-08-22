import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AppHeader } from '../components/AppHeader';
import { ContentRow } from '../components/ContentRow';
import { useAuth } from '../hooks/useAuth';
import { SAMPLE_NOTES, SAMPLE_TESTS, SAMPLE_VIDEOS } from '../lib/sample-content';

/**
 * The logged-in home: content shelves, browsable by everyone. The first item
 * of each shelf is free; the rest unlock with payment. Rows currently render
 * sample data — they switch to the content API when it exists.
 */
const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function DashboardPage() {
  const { user, isPremium } = useAuth();
  const firstName = (user?.name ?? 'Student').split(' ')[0];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />

      <motion.main
        className="mx-auto max-w-6xl px-6 pb-16 sm:px-10"
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
                <p className="text-white/85">
                  <s className="text-white/45">₹6,000</s>{' '}
                  <span className="font-display text-[1.7rem] font-extrabold">₹3,499</span>
                </p>
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
            items={SAMPLE_VIDEOS}
            kind="video"
            isPremium={isPremium}
          />
        </motion.div>

        <motion.div variants={rise}>
          <ContentRow
            title="Notes & highlights"
            viewAllTo="/notes"
            items={SAMPLE_NOTES}
            kind="note"
            isPremium={isPremium}
          />
        </motion.div>

        <motion.div variants={rise}>
          <ContentRow
            title="CBT mock tests"
            viewAllTo="/mock-tests"
            items={SAMPLE_TESTS}
            kind="test"
            isPremium={isPremium}
          />
        </motion.div>

        <motion.p variants={rise} className="mt-10 text-center text-sm text-ink-faint">
          NEET: 720 marks · Physics 180 · Chemistry 180 · Biology 360
        </motion.p>
      </motion.main>
    </div>
  );
}
