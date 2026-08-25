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
 * reads as the single thing to act on. It is the same pressable sticker as
 * the nav items — it drops into its own shadow when pressed — and the arrow
 * nudges forward on hover, answering "what happens next" before the press.
 */
export function Button({ children, loading, loadingLabel, disabled, ...props }: ButtonProps) {
  const isBusy = Boolean(loading);

  return (
    <motion.button
      {...props}
      disabled={disabled || isBusy}
      aria-busy={isBusy || undefined}
      className="sticker-btn group flex w-full font-sans text-[0.95rem]"
    >
      {isBusy ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-bubble border-2 border-[var(--brut-line)]/30 border-t-[var(--brut-line)]" />
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
