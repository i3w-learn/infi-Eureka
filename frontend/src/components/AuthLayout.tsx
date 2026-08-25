import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { AnswerSheet } from './AnswerSheet';
import { BrandMark } from './BrandMark';

/**
 * The shell both signup and login sit in: form on a sticker card over warm
 * paper, brand panel in plum. The card, field and button use the same
 * keyline-and-hard-shadow language as the app shell, so logging in and
 * landing on the dashboard look like the same product.
 *
 * The panel states what the paper actually is — 720 marks across three
 * subjects, Biology worth double the others. That is the fact a NEET student
 * plans their year around, and it says what this product covers faster than a
 * marketing line would. The marks are drawn as bars so Biology's double
 * weight is visible before it is read.
 */
const PAPER = [
  { subject: 'Physics', marks: 180 },
  { subject: 'Chemistry', marks: 180 },
  { subject: 'Biology', marks: 360 },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const cardStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const rise = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Counts up to `to` on mount. Jumps straight there for reduced-motion users. */
function CountUp({ to, durationMs = 1100 }: { to: number; durationMs?: number }) {
  // Reduced-motion users start (and stay) at the final value.
  const [value, setValue] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? to : 0,
  );

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, durationMs]);

  return <span className="tabular-nums">{value}</span>;
}

const DRIFTERS = [
  { size: 90, left: '8%', duration: 26, delay: 0 },
  { size: 46, left: '30%', duration: 21, delay: 6 },
  { size: 140, left: '68%', duration: 32, delay: 2 },
  { size: 60, left: '85%', duration: 24, delay: 10 },
];

/** Slow-rising empty answer bubbles that keep the panel alive after load. */
function DriftingBubbles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {DRIFTERS.map((bubble, index) => (
        <motion.span
          key={index}
          className="absolute rounded-bubble border border-white/10"
          style={{ width: bubble.size, height: bubble.size, left: bubble.left, bottom: -bubble.size }}
          animate={{ y: [0, -900], opacity: [0, 0.7, 0.7, 0] }}
          transition={{
            duration: bubble.duration,
            delay: bubble.delay,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.1, 0.85, 1],
          }}
        />
      ))}
    </div>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="min-h-screen bg-paper lg:grid lg:grid-cols-[1fr_minmax(23rem,42%)]">
      {/* Form side */}
      <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
        {/* Ambient washes of colour behind the card. Pure decoration. */}
        <div aria-hidden="true" className="auth-blob auth-blob-marigold" />
        <div aria-hidden="true" className="auth-blob auth-blob-plum" />

        <Link
          to="/"
          className="relative inline-flex w-fit rounded-lg text-ink transition-opacity hover:opacity-70"
        >
          <BrandMark size="lg" />
        </Link>

        <div className="relative mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-10">
          <motion.div
            className="sticker-card p-7 sm:p-9"
            initial="hidden"
            animate="visible"
            variants={cardStagger}
          >
            <motion.h1
              variants={rise}
              className="font-display text-[1.9rem] leading-[1.08] font-bold tracking-tight text-ink sm:text-[2.25rem]"
            >
              {title}
              {/* The pencil-stroke underline draws itself in. */}
              <motion.span
                aria-hidden="true"
                className="mt-2 block h-[3px] w-16 origin-left rounded-bubble bg-marigold"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.5, ease: EASE }}
              />
            </motion.h1>

            <motion.p variants={rise} className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
              {subtitle}
            </motion.p>

            <motion.div variants={rise} className="mt-8">
              {children}
            </motion.div>

            <motion.p variants={rise} className="mt-7 text-sm text-ink-soft">
              {footer}
            </motion.p>
          </motion.div>
        </div>
      </div>

      {/* Brand panel */}
      <aside className="auth-panel relative hidden overflow-hidden bg-plum lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(125% 95% at 88% -5%, #74498d 0%, #4c2a5e 42%, #2a1340 100%)',
          }}
        />
        {/* Faint dotted texture, like the guide marks on an OMR sheet. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        <DriftingBubbles />

        <div className="relative flex flex-1 items-center">
          <AnswerSheet />
        </div>

        <div className="relative mt-10 max-w-md shrink-0">
          <motion.p
            className="font-display text-[1.6rem] leading-snug font-semibold text-balance text-white"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
          >
            <span className="text-marigold-soft">
              <CountUp to={720} />
            </span>{' '}
            marks, three subjects, one paper.
          </motion.p>

          <motion.ul
            className="mt-6 space-y-3 border-t border-white/15 pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {PAPER.map(({ subject, marks }) => (
              <li key={subject} className="flex items-center gap-4">
                <span className="w-24 text-sm text-white/65">{subject}</span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-bubble bg-white/10">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-bubble bg-marigold/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${(marks / 360) * 100}%` }}
                    transition={{ delay: 0.7, duration: 0.8, ease: EASE }}
                  />
                </span>
                <span className="w-10 text-right font-sans text-sm font-semibold tabular-nums text-white/90">
                  {marks}
                </span>
              </li>
            ))}
          </motion.ul>
        </div>
      </aside>
    </main>
  );
}
