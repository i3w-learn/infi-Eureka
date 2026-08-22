import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

/**
 * The hamburger menu on the home page. Opens a plum drawer listing the three
 * features as exam options A/B/C — the same shape as the feature cards, so the
 * menu itself teaches the product's vocabulary.
 *
 * The feature routes are login-gated: a visitor who taps one lands on login
 * first, which is exactly the flow we want.
 */
const ITEMS = [
  { option: 'A', title: 'One-shot videos', caption: 'Full chapters, single sittings', to: '/videos' },
  { option: 'B', title: 'Notes & highlights', caption: 'Read and mark what matters', to: '/notes' },
  { option: 'C', title: 'CBT mock tests', caption: 'Real exam interface, instant score', to: '/mock-tests' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function FeatureMenu() {
  const [open, setOpen] = useState(false);

  // Escape closes; the page behind must not scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Open menu"
        className="grid h-11 w-11 place-items-center rounded-xl border border-paper-edge bg-white transition-colors hover:border-marigold"
      >
        <span className="flex w-5 flex-col gap-[5px]">
          <span className="h-[2px] rounded-bubble bg-ink" />
          <span className="h-[2px] w-3.5 rounded-bubble bg-marigold" />
          <span className="h-[2px] rounded-bubble bg-ink" />
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            {/* Dimmed page behind the drawer; clicking it closes. */}
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-plum-deep/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Features"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-plum p-7 shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="flex items-center justify-between">
                <p className="text-[0.7rem] font-medium tracking-[0.18em] text-white/50 uppercase">
                  What's inside
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 place-items-center rounded-bubble border border-white/20 text-white/70 transition-colors hover:border-marigold hover:text-white"
                >
                  ✕
                </button>
              </div>

              <nav className="mt-8 flex flex-col gap-3">
                {ITEMS.map((item, index) => (
                  <motion.div
                    key={item.option}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + index * 0.07, duration: 0.4, ease: EASE }}
                  >
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-marigold/60 hover:bg-white/10"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-bubble border-2 border-white/25 font-display text-base font-bold text-white/80 transition-colors group-hover:border-marigold group-hover:bg-marigold group-hover:text-white">
                        {item.option}
                      </span>
                      <span className="flex-1">
                        <span className="block font-display text-[1.05rem] font-bold text-white">
                          {item.title}
                        </span>
                        <span className="block text-[0.8rem] text-white/55">{item.caption}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-white/40 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-marigold"
                      >
                        →
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                className="mt-auto flex flex-col gap-3 border-t border-white/15 pt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <p className="text-center text-sm text-white/55">
                  <s>₹6,000</s> <span className="font-semibold text-white">₹3,499</span> unlocks
                  everything
                </p>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-5 py-3 text-center font-semibold text-white shadow-[0_10px_24px_-10px_rgba(239,113,38,0.65)] transition-transform hover:-translate-y-0.5"
                >
                  Get started
                </Link>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-white/20 px-5 py-3 text-center font-medium text-white/85 transition-colors hover:border-white/45"
                >
                  Log in
                </Link>
              </motion.div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
