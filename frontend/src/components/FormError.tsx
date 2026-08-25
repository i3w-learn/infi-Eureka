import { AnimatePresence, motion } from 'motion/react';

/**
 * Whole-form failures: wrong password, email already taken, server down.
 *
 * `role="alert"` means a screen reader announces it the moment it appears,
 * which matters because the message is usually far from the button just pressed.
 */
export function FormError({ message }: { message?: string | undefined }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <span className="auth-error mb-5 block px-3.5 py-3 text-[0.85rem] leading-relaxed font-medium text-danger">
            {message}
          </span>
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
