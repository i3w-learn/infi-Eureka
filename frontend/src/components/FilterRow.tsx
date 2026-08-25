import { motion } from 'motion/react';

/**
 * One row of OMR-bubble chips: the label on the left, the choices after it.
 * Radio behaviour — exactly one chip is filled at a time.
 *
 * Shared by the catalogue grids and the book shelves so a filter added in one
 * place looks and behaves the same in the other.
 */
interface FilterRowProps<T extends string | number> {
  label: string;
  delay: number;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}

export function FilterRow<T extends string | number>({
  label,
  delay,
  options,
  selected,
  onSelect,
}: FilterRowProps<T>) {
  return (
    <motion.div
      role="radiogroup"
      aria-label={label}
      className="mt-4 flex flex-wrap items-center gap-2 first-of-type:mt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <span className="mr-1 w-14 text-[0.8rem] font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </span>
      {options.map(({ value, label: optionLabel }) => {
        const active = selected === value;
        return (
          <button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(value)}
            className={`flex items-center gap-2 rounded-bubble border px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-marigold bg-marigold-wash text-ink'
                : 'border-paper-edge bg-white text-ink-soft hover:border-ink-faint'
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-bubble ${active ? 'bg-marigold' : 'border border-ink-faint/50'}`}
            />
            {optionLabel}
          </button>
        );
      })}
    </motion.div>
  );
}

/** The class chips a shelf offers, given the classes its content covers. */
export function gradeFilterOptions(grades: number[]): { value: 'all' | number; label: string }[] {
  return [
    { value: 'all', label: 'All classes' },
    ...grades.map((grade) => ({ value: grade, label: `Class ${grade}` })),
  ];
}
