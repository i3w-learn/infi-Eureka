import { motion } from 'motion/react';

/**
 * The signature element: a fragment of an OMR answer sheet.
 *
 * The bubble grid is the one artifact every Indian competitive-exam student
 * recognises instantly, which is why it carries the brand here instead of
 * stock illustration. It is cropped rather than centred so it reads as a piece
 * of a real sheet rather than a diagram of one.
 *
 * On load the answers fill in one after another, at roughly the pace someone
 * works through a section. Reduced-motion users get the finished sheet with no
 * movement — handled globally by MotionConfig in App.tsx.
 */

/** Question number → the option that gets filled. Fixed, so it never flickers. */
const ANSWERS = [
  [17, 2],
  [18, 0],
  [19, 3],
  [20, 1],
  [21, 1],
  [22, 3],
  [23, 0],
  [24, 2],
  [25, 3],
] as const;

const OPTIONS = ['A', 'B', 'C', 'D'];

export function AnswerSheet() {
  return (
    <div aria-hidden="true" className="select-none">
      <div className="flex flex-col gap-[0.7rem]">
        {ANSWERS.map(([question, answer], row) => (
          <motion.div
            key={question}
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: row * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="w-6 text-right font-sans text-[0.7rem] tabular-nums text-white/35">
              {question}
            </span>

            <div className="flex gap-2">
              {OPTIONS.map((option, index) => {
                const filled = index === answer;
                return (
                  <div
                    key={option}
                    className="grid h-[1.35rem] w-[1.35rem] place-items-center rounded-bubble border border-white/25"
                  >
                    {filled ? (
                      <motion.span
                        className="block h-full w-full rounded-bubble bg-marigold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.5 + row * 0.13,
                          type: 'spring',
                          stiffness: 500,
                          damping: 22,
                        }}
                      />
                    ) : (
                      <span className="text-[0.6rem] font-medium text-white/25">{option}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
