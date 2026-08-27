import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { FormError } from '../components/FormError';
import { formatPaise } from '../api/payments.api';
import { usePayment } from '../hooks/usePayment';
import { useAuth } from '../hooks/useAuth';

const EASE = [0.16, 1, 0.3, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** What the one payment actually buys. Every line is something that exists. */
const INCLUDED = [
  'Every one-shot video, start to finish',
  'All chapter notes with highlights',
  'Formula sheets for Physics, Chemistry and Biology',
  'NCERT Highlights, chapter by chapter',
  'Full CBT mock tests with the real exam interface',
  'Answer sheets and performance analysis after every test',
];

function Tick() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-bubble bg-marigold-wash text-[0.7rem] font-bold text-marigold"
    >
      ✓
    </span>
  );
}

/**
 * The paywall: the one screen where money changes hands.
 *
 * Everything locked in the app points here, so it has one job — say what the
 * payment buys, show the price the server actually charges, and open Razorpay.
 * The price is never hard-coded: it comes from GET /plans/active, the same
 * table the server bills from, so the number on screen and the number charged
 * cannot drift apart.
 */
export function UnlockPage() {
  const { isPremium } = useAuth();
  const { plan, planError, stage, error, pay } = usePayment();
  const busy = stage === 'opening' || stage === 'verifying';

  if (isPremium) {
    return (
      <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
        <motion.div initial="hidden" animate="visible" variants={rise} className="mx-auto max-w-2xl">
          <div className="sticker-card p-9 text-center sm:p-12">
            <p className="text-[0.8rem] font-medium tracking-[0.18em] text-success uppercase">
              {stage === 'done' ? 'Payment received' : 'Full access'}
            </p>
            <h1 className="mt-4 font-display text-[2rem] leading-tight font-extrabold tracking-tight sm:text-[2.4rem]">
              {stage === 'done' ? "You're in." : 'Everything is already unlocked.'}
            </h1>
            <p className="mt-3 text-[0.95rem] text-ink-soft">
              Every video, note, sheet and mock test is open on this account. No renewals, nothing
              else to pay.
            </p>
            <Link to="/dashboard" className="sticker-btn group mt-8 px-8">
              Start studying
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full px-5 pt-6 pb-16 sm:px-8 lg:px-10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="mx-auto max-w-5xl"
      >
        <motion.p
          variants={rise}
          className="mt-4 text-[0.8rem] font-medium tracking-[0.18em] text-ink-faint uppercase"
        >
          One payment, everything
        </motion.p>
        <motion.h1
          variants={rise}
          className="mt-3 font-display text-[2rem] leading-tight font-extrabold tracking-tight sm:text-[2.5rem]"
        >
          Unlock the full course.
        </motion.h1>
        <motion.p variants={rise} className="mt-2 max-w-2xl text-[1.02rem] text-ink-soft">
          Yours until the exam. No subscription, no renewals, nothing charged again.
        </motion.p>

        <div className="mt-9 grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          {/* What the money buys */}
          <motion.ul variants={rise} className="sticker-card space-y-3.5 p-7 sm:p-8">
            {INCLUDED.map((line) => (
              <li key={line} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-soft">
                <Tick />
                <span>{line}</span>
              </li>
            ))}
          </motion.ul>

          {/* The price and the button */}
          <motion.div variants={rise} className="sticker-card p-7 sm:p-8">
            {planError ? (
              <p className="text-[0.95rem] text-danger">{planError}</p>
            ) : plan ? (
              <>
                <p className="text-[0.8rem] font-medium tracking-[0.16em] text-ink-faint uppercase">
                  {plan.name}
                </p>
                <p className="mt-4 flex items-baseline gap-3">
                  {plan.mrpPaise > plan.pricePaise ? (
                    <s className="text-lg text-ink-faint">{formatPaise(plan.mrpPaise)}</s>
                  ) : null}
                  <span className="font-display text-[2.8rem] leading-none font-extrabold tracking-tight">
                    {formatPaise(plan.pricePaise)}
                  </span>
                </p>
                <p className="mt-2 text-[0.85rem] text-ink-faint">
                  One time · {plan.currency} · taxes included
                </p>

                <div className="mt-7">
                  <FormError message={error} />
                  <Button
                    onClick={() => void pay()}
                    loading={busy}
                    loadingLabel={
                      stage === 'verifying' ? 'Confirming payment…' : 'Opening checkout…'
                    }
                  >
                    Pay {formatPaise(plan.pricePaise)}
                  </Button>
                </div>

                <p className="mt-4 text-center text-[0.78rem] leading-relaxed text-ink-faint">
                  Secured by Razorpay · UPI, cards, netbanking and wallets. We never see your card
                  details.
                </p>
              </>
            ) : (
              <p className="page-status">Loading the price…</p>
            )}
          </motion.div>
        </div>

        <motion.p variants={rise} className="mt-8 text-[0.85rem] text-ink-faint">
          Payment troubles? Message us on the number you signed up with and we will sort it out.
        </motion.p>
      </motion.div>
    </div>
  );
}
