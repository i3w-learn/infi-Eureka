import confetti from 'canvas-confetti';
import type { Variants } from 'motion/react';

/**
 * Shared animation vocabulary.
 *
 * Pages import these rather than inventing their own timings, so the whole app
 * moves at the same speed and a change here changes everything at once.
 *
 * Accessibility is handled globally by `<MotionConfig reducedMotion="user">`
 * in App.tsx — a student who has asked their operating system to reduce motion
 * gets the layout without the movement, automatically. The only thing that
 * needs a manual check is confetti, because it is not a Motion animation.
 */

/** Seconds. Anything an exam-taker waits on should use `fast`. */
export const DURATION = {
  fast: 0.18,
  base: 0.38,
  slow: 0.7,
} as const;

/** Gentle overshoot, used for anything that appears. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Rise and fade in. The default for a section entering the screen. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.base } },
};

/**
 * Put this on a parent and `fadeUp` on each child, and the children arrive
 * one after another instead of all at once.
 */
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

/** Lift on hover. For cards that can be clicked. */
export const lift = {
  whileHover: { y: -4, transition: { duration: DURATION.fast } },
  whileTap: { scale: 0.98 },
} as const;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A burst of confetti. Save it for moments that genuinely deserve one —
 * unlocking the course, finishing a mock test — never for routine actions.
 */
export function celebrate(): void {
  if (prefersReducedMotion()) return;

  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true,
  });
}
