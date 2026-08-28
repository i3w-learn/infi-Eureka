import { AnimatePresence, motion } from 'motion/react';

/**
 * A message that is not a failure: "you already have an account, log in here".
 *
 * Same shape as FormError but in the marigold wash rather than red, because
 * nothing went wrong — the person is simply on the wrong page. `role="status"`
 * announces it politely instead of interrupting like an alert.
 */
export function FormNotice({ message }: { message?: string | undefined }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          role="status"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <span className="auth-notice mb-5 block px-3.5 py-3 text-[0.85rem] leading-relaxed font-medium text-ink">
            {message}
          </span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
