/**
 * The signature element: a fragment of an OMR answer sheet.
 *
 * The bubble grid is the one artifact every Indian competitive-exam student
 * recognises instantly, which is why it carries the brand here instead of
 * stock illustration. It is cropped rather than centred so it reads as a piece
 * of a real sheet rather than a diagram of one.
 *
 * Two variants, because the crop only works if something actually gets cut:
 *
 * - `card` sits inside the bordered card on the landing page. The card edge is
 *   the crop, so one short column of rows is all it needs.
 * - `panel` fills the tall brand panel beside the auth forms. It runs taller
 *   than the space it is given and flows into as many columns as the panel is
 *   wide, so it bleeds off the top and bottom and fills the width on any
 *   monitor. The panel is a percentage of the viewport, so a fixed number of
 *   columns either leaves half of it empty on a wide screen or overruns a
 *   narrow one — letting the browser count them is the only thing that holds
 *   at both ends.
 *
 * On load the answers fill in one after another, at roughly the pace someone
 * works through a section. The animation is CSS rather than a motion component
 * per row: the panel runs a hundred-odd rows, and that many motion nodes is a
 * real cost on a page whose job is a login form. Reduced-motion users get the
 * finished sheet with no movement — see the guard in global.css.
 */

/** The first question on the sheet. The rest run on from here. */
const FIRST_QUESTION = 9;

/**
 * Which option is filled, one digit per question. Fixed, so it never flickers
 * between renders, and balanced across A-D with no two neighbours alike so it
 * reads as a sat paper rather than a pattern.
 *
 * Long enough to fill the tallest panel at the widest column count. Anything
 * spare is simply never brought into view.
 */
const ANSWERS =
  '031320303020103030131301312131321302312101202310131032312320202123132032032102010213103102102021232032021';

const OPTIONS = ['A', 'B', 'C', 'D'];

/** The window the landing-page card shows - questions 17 to 25. */
const CARD_WINDOW = { start: 8, count: 9 };

/** One column's worth of bubbles, in px. Drives the browser's column count. */
const COLUMN_WIDTH = 186;
const COLUMN_GAP = '2.5rem';

/**
 * How far the panel sheet overruns the space it is given, top and bottom
 * together. Guarantees a row is cut at both edges at any panel height.
 */
const PANEL_BLEED = '4rem';

/** The fill walks down the sheet and lands in about this long, whatever the length. */
const FILL_RUN_SECONDS = 1.5;

const VARIANTS = {
  card: {
    window: CARD_WINDOW,
    container: 'flex flex-col',
    containerStyle: undefined,
    row: 'mb-[0.7rem] gap-3',
    bubble: 'h-[1.35rem] w-[1.35rem]',
    bubbleGap: 'gap-2',
    letter: 'text-[0.6rem]',
    number: 'w-6 text-[0.7rem]',
  },
  panel: {
    window: { start: 0, count: ANSWERS.length },
    // shrink-0: it is a flex item, and the default flex-shrink would pull it
    // straight back to the panel width and undo the overhang below.
    container: 'shrink-0',
    containerStyle: {
      // A column wider than the panel, so one always starts and gets cut by
      // the panel edge. Without it the browser fits a whole number of columns
      // and whatever is left over sits as dead space down the right-hand side.
      width: `calc(100% + ${COLUMN_WIDTH}px)`,
      height: `calc(100% + ${PANEL_BLEED})`,
      columnWidth: `${COLUMN_WIDTH}px`,
      columnGap: COLUMN_GAP,
      columnFill: 'auto' as const,
    },
    row: 'mb-[0.85rem] gap-4 break-inside-avoid',
    bubble: 'h-[1.75rem] w-[1.75rem]',
    bubbleGap: 'gap-2.5',
    letter: 'text-[0.72rem]',
    number: 'w-7 text-[0.78rem]',
  },
} as const;

interface AnswerSheetProps {
  variant?: keyof typeof VARIANTS;
}

export function AnswerSheet({ variant = 'card' }: AnswerSheetProps) {
  const style = VARIANTS[variant];
  const { start, count } = style.window;
  const fillStep = FILL_RUN_SECONDS / count;

  return (
    // One element, not a wrapper around a container: a shrink-to-fit wrapper
    // collapses `w-full` to a single column's width and the sheet never
    // flows into more than one column.
    <div aria-hidden="true" className={`select-none ${style.container}`} style={style.containerStyle}>
      {Array.from({ length: count }, (_, row) => {
        const question = FIRST_QUESTION + start + row;
        const answer = Number(ANSWERS[start + row]);
        return (
          <div
            key={question}
            className={`sheet-row flex items-center last:mb-0 ${style.row}`}
            style={{ animationDelay: `${row * 0.012}s` }}
          >
            <span className={`text-right font-sans tabular-nums text-white/35 ${style.number}`}>
              {question}
            </span>

            <div className={`flex ${style.bubbleGap}`}>
              {OPTIONS.map((option, index) => (
                <div
                  key={option}
                  className={`grid place-items-center rounded-bubble border border-white/25 ${style.bubble}`}
                >
                  {index === answer ? (
                    <span
                      className="sheet-bubble block h-full w-full rounded-bubble bg-marigold"
                      style={{ animationDelay: `${0.45 + row * fillStep}s` }}
                    />
                  ) : (
                    <span className={`font-medium text-white/25 ${style.letter}`}>{option}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
