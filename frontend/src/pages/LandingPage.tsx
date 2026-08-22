import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AnswerSheet } from '../components/AnswerSheet';
import { FeatureMenu } from '../components/FeatureMenu';

/**
 * The public home page. Everything a visitor sees before signing up.
 *
 * Same design language as auth: warm paper, plum panels, marigold rationed to
 * the actions and the OMR bubbles. Sections reveal as they scroll into view,
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

function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-3 rounded-lg text-ink transition-opacity hover:opacity-70">
      <span className="grid h-10 w-10 place-items-center rounded-bubble bg-plum shadow-[0_6px_18px_rgba(76,42,94,0.4)]">
        <span className="grid h-5 w-5 place-items-center rounded-bubble border-2 border-white/30">
          <span className="h-2.5 w-2.5 rounded-bubble bg-marigold" />
        </span>
      </span>
      <span className="font-display text-[1.4rem] font-extrabold tracking-tight">
        infi<span className="text-marigold">-</span>Eureka
      </span>
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* ---- Nav ---- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:block"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="hidden rounded-xl bg-plum px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(76,42,94,0.6)] transition-transform hover:-translate-y-0.5 sm:block"
          >
            Get started
          </Link>
          <FeatureMenu />
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-10 pb-20 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:pt-16 lg:pb-28">
        <div>
          <motion.p
            className="inline-flex items-center gap-2 rounded-bubble border border-paper-edge bg-white px-3.5 py-1.5 text-[0.8rem] font-medium text-ink-soft"
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
            One-shot videos, notes with your own highlights, and mock tests on the real exam
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
              className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-6 py-3.5 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(239,113,38,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(239,113,38,0.8)]"
            >
              Start preparing
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <p className="text-sm text-ink-faint">
              <s>₹6,000</s> <span className="font-semibold text-ink">₹3,499</span> · one time
            </p>
          </motion.div>
        </div>

        {/* The answer sheet, framed as the object it is. */}
        <motion.div
          className="relative mx-auto w-full max-w-md"
          initial={{ opacity: 0, y: 32, rotate: 1.5 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.7, ease: EASE }}
        >
          <div className="relative rounded-3xl bg-plum p-8 shadow-[0_32px_70px_-28px_rgba(44,21,64,0.55)]">
            <div
              className="absolute inset-0 rounded-3xl opacity-90"
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
      <section className="bg-white/60 py-20">
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
                className="group rounded-3xl border border-paper-edge bg-white p-7 shadow-[0_10px_30px_-18px_rgba(44,21,64,0.18)] transition-all hover:-translate-y-1.5 hover:shadow-[0_22px_44px_-20px_rgba(44,21,64,0.3)]"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: index * 0.1, duration: 0.55, ease: EASE }}
              >
                <span className="grid h-11 w-11 place-items-center rounded-bubble border-2 border-plum/20 font-display text-lg font-bold text-plum transition-colors group-hover:border-marigold group-hover:bg-marigold group-hover:text-white">
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
        <div className="grid items-center gap-10 rounded-3xl bg-plum p-8 sm:p-12 lg:grid-cols-2">
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
          className="mx-auto max-w-2xl rounded-3xl border border-paper-edge bg-white p-9 text-center shadow-[0_24px_60px_-24px_rgba(44,21,64,0.25)] sm:p-12"
          {...reveal}
        >
          <p className="text-[0.8rem] font-medium tracking-[0.18em] text-ink-faint uppercase">
            One payment, everything
          </p>
          <p className="mt-5 flex items-baseline justify-center gap-3">
            <s className="text-xl text-ink-faint">₹6,000</s>
            <span className="font-display text-[3.2rem] leading-none font-extrabold tracking-tight">
              ₹3,499
            </span>
          </p>
          <p className="mt-3 text-[0.95rem] text-ink-soft">
            Every video, every note, every mock test. Yours until the exam — no renewals, no
            subscription.
          </p>
          <Link
            to="/signup"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-8 py-3.5 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(239,113,38,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(239,113,38,0.8)]"
          >
            Unlock everything
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </motion.div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-paper-edge">
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
