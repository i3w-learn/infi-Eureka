import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';

// Extends Motion's own button props rather than React's, because the two
// disagree on the native animation event handlers.
interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'className' | 'children'> {
  children: ReactNode;
  loading?: boolean;
  /** Text shown while loading. Say what is happening, not "Please wait". */
  loadingLabel?: string;
}

/**
 * The one marigold element on the page. Everything else stays quiet so this
 * reads as the single thing to act on. The arrow nudges forward on hover —
 * the button answers "what happens next" before it is pressed.
 */
export function Button({ children, loading, loadingLabel, disabled, ...props }: ButtonProps) {
  const isBusy = Boolean(loading);

  return (
    <motion.button
      {...props}
      disabled={disabled || isBusy}
      aria-busy={isBusy || undefined}
      whileHover={disabled || isBusy ? undefined : { y: -2 }}
      whileTap={disabled || isBusy ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-[#f8823c] to-marigold px-5 py-3.5 font-sans text-[0.95rem] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(239,113,38,0.65)] transition-shadow hover:shadow-[0_14px_30px_-10px_rgba(239,113,38,0.8)] disabled:cursor-not-allowed disabled:from-marigold-soft disabled:to-marigold-soft disabled:shadow-none"
    >
      {isBusy ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-bubble border-2 border-white/40 border-t-white" />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {children}
          <span
            aria-hidden="true"
            className="translate-x-0 transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </>
      )}
    </motion.button>
  );
}
