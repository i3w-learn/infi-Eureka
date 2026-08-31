import { Link } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { motion } from 'motion/react';
import { AnswerSheet } from '../components/AnswerSheet';
import { formatPaise } from '../api/payments.api';
import { useActivePlan } from '../hooks/useActivePlan';

/**
 * The public home page. Everything a visitor sees before signing up.
 *
 * Same sticker language as auth and the app shell: keyline, hard shadow, warm
 * paper, plum panels, marigold rationed to the actions and the OMR bubbles. Sections reveal as they scroll into view,
 * once, and stay put.
 */
const EASE = [0.16, 1, 0.3, 1] as const;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.55, ease: EASE },
};

/** The three things the product is. Labelled A/B/C like exam options. */
const FEATURES = [
  {
    option: 'A',
    title: 'One-shot videos',
    body: 'A full chapter in a single sitting. Watch, pause, rewatch — the whole syllabus, subject by subject.',
  },
  {
    option: 'B',
    title: 'Notes & highlights',
    body: 'Read the notes, highlight what matters to you, and find your highlights waiting when you come back.',
  },
  {
    option: 'C',
    title: 'CBT mock tests',
    body: 'The real exam interface: timed, question palette, mark for review. Scored the moment you submit.',
  },
];

const PAPER = [
  { subject: 'Physics', marks: 180 },
  { subject: 'Chemistry', marks: 180 },
  { subject: 'Biology', marks: 360 },
];

/**
 * `compact` is for the header, which has to fit two actions beside it: on a
 * phone the wordmark drops and the mark stands alone rather than truncating.
 * The footer wraps, so it always shows the full lockup.
 */
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex min-w-0 rounded-lg text-ink transition-opacity hover:opacity-70">
      {compact ? (
        <>
          <img src="/i3w-mark.png" alt="infi-Eureka" className="h-9 w-auto sm:hidden" />
          <span className="hidden sm:inline-flex">
            <BrandMark />
          </span>
        </>
      ) : (
        <BrandMark />
      )}
    </Link>
  );
}

export function LandingPage() {
  const { plan } = useActivePlan();

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ---- Nav ---- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-10">
        <Logo compact />
        {/* Two links, no drawer. The feature routes behind the old menu were
            login-gated anyway, so a visitor's only real choices here are to
            sign in or sign up — and both fit on a phone without a menu. */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="px-3 py-2.5 text-sm font-semibold whitespace-nowrap text-ink-soft transition-colors hover:text-ink sm:px-4"
          >
            Log in
          </Link>
          <Link to="/signup" className="sticker-btn" data-variant="plum" data-size="sm">
            Get started
          </Link>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-20 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
        <div>
          <motion.p
            className="sticker-pill text-[0.8rem] font-semibold"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="h-2 w-2 rounded-bubble bg-marigold" />
            NEET preparation, all of it
          </motion.p>

          <motion.h1
            className="mt-5 font-display text-[2.6rem] leading-[1.05] font-extrabold tracking-tight text-balance sm:text-[3.4rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.55, ease: EASE }}
          >
            720 marks. <span className="text-marigold">One</span> place to earn them.
          </motion.h1>

          <motion.p
            className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.55, ease: EASE }}
          >
            One-shot videos, notes and highlights, and mock tests on the real exam
            interface. One payment unlocks everything — no subscription.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.55, ease: EASE }}
          >
            <Link
              to="/signup"
              className="sticker-btn group"
            >
              Start preparing
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
            {plan ? (
              <p className="text-sm text-ink-faint">
                {plan.mrpPaise > plan.pricePaise ? <s>{formatPaise(plan.mrpPaise)}</s> : null}{' '}
                <span className="font-semibold text-ink">{formatPaise(plan.pricePaise)}</span> · one
                time
              </p>
            ) : null}
          </motion.div>
        </div>

        {/* The answer sheet, framed as the object it is. */}
        <motion.div
          className="relative mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 32, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
        >
          <div className="sticker-card relative p-8" data-tone="plum">
            <div
              className="absolute inset-0 rounded-[23px] opacity-90"
              style={{
                background: 'radial-gradient(120% 100% at 80% -10%, #74498d 0%, #4c2a5e 45%, #2a1340 100%)',
              }}
            />
            <div className="relative">
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[0.7rem] font-medium tracking-[0.18em] text-white/50 uppercase">
                  Answer sheet
                </p>
                <p className="text-[0.7rem] text-white/50">Section B</p>
              </div>
              <AnswerSheet />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-y-[3px] border-[var(--brut-line)] bg-paper-warm py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-10">
          <motion.h2
            className="font-display text-[1.9rem] font-bold tracking-tight sm:text-[2.3rem]"
            {...reveal}
          >
            Pick your answer. It's all of the above.
          </motion.h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <motion.article
                key={feature.option}
                className="sticker-card group p-7"
                data-pressable="true"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: index * 0.1, duration: 0.55, ease: EASE }}
              >
                <span className="sticker-option">
                  {feature.option}
                </span>
                <h3 className="mt-5 font-display text-[1.2rem] font-bold">{feature.title}</h3>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft">{feature.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- The paper ---- */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10">
        <div className="sticker-card grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-2" data-tone="plum">
          <div>
            <motion.h2
              className="font-display text-[1.7rem] leading-snug font-bold tracking-tight text-white sm:text-[2rem]"
              {...reveal}
            >
              Built around the paper you'll actually sit.
            </motion.h2>
            <motion.p className="mt-4 max-w-md leading-relaxed text-white/65" {...reveal}>
              Three subjects, 180 questions, 720 marks — and Biology counts double. Everything
              here follows that weight, so your time goes where the marks are.
            </motion.p>
          </div>

          <motion.ul className="space-y-4" {...reveal}>
            {PAPER.map(({ subject, marks }) => (
              <li key={subject} className="flex items-center gap-4">
                <span className="w-24 text-sm text-white/65">{subject}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-bubble bg-white/10">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-bubble bg-marigold/80"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(marks / 360) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
                  />
                </span>
                <span className="w-10 text-right font-sans text-sm font-semibold tabular-nums text-white/90">
                  {marks}
                </span>
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ---- Pricing ---- */}
      <section className="mx-auto max-w-6xl px-6 pb-24 sm:px-10">
        <motion.div
          className="sticker-card mx-auto max-w-2xl p-9 text-center sm:p-12"
          {...reveal}
        >
          <p className="text-[0.8rem] font-medium tracking-[0.18em] text-ink-faint uppercase">
            One payment, everything
          </p>
          {plan ? (
            <p className="mt-5 flex items-baseline justify-center gap-3">
              {plan.mrpPaise > plan.pricePaise ? (
                <s className="text-xl text-ink-faint">{formatPaise(plan.mrpPaise)}</s>
              ) : null}
              <span className="font-display text-[3.2rem] leading-none font-extrabold tracking-tight">
                {formatPaise(plan.pricePaise)}
              </span>
            </p>
          ) : null}
          <p className="mt-3 text-[0.95rem] text-ink-soft">
            Every video, every note, every mock test. Yours until the exam — no renewals, no
            subscription.
          </p>
          <Link
            to="/signup"
            className="sticker-btn group mt-8 px-8"
          >
            Unlock everything
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t-[3px] border-[var(--brut-line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 sm:px-10">
          <Logo />
          <nav className="flex items-center gap-6 text-sm text-ink-soft">
            <Link to="/login" className="transition-colors hover:text-ink">
              Log in
            </Link>
            <Link to="/signup" className="transition-colors hover:text-ink">
              Create account
            </Link>
          </nav>
          <p className="text-sm text-ink-faint">© {new Date().getFullYear()} infi-Eureka</p>
        </div>
      </footer>
    </div>
  );
}
