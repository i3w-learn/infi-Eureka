import { motion } from 'motion/react';

interface Option {
  value: string;
  label: string;
}

interface ChipGroupProps {
  label: string;
  /** Shown faintly next to the label, e.g. "optional". */
  tag?: string;
  /** Shown under the chips when nothing is picked. */
  error?: string | undefined;
  options: readonly Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** false = radio behaviour (one choice), true = any number. */
  multi?: boolean;
}

/**
 * Choice chips styled as OMR answer bubbles: each chip carries a small circle
 * that fills marigold when picked — answering a question by darkening a bubble,
 * same as the exam.
 */
export function ChipGroup({
  label,
  tag,
  error,
  options,
  selected,
  onChange,
  multi = false,
}: ChipGroupProps) {
  function toggle(value: string) {
    if (multi) {
      onChange(
        selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value],
      );
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  }

  return (
    <fieldset aria-invalid={error ? true : undefined}>
      <legend className="text-sm font-medium text-ink">
        {label}
        {tag ? <span className="ml-2 text-[0.75rem] font-normal text-ink-faint">{tag}</span> : null}
      </legend>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <motion.button
              key={option.value}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              onClick={() => toggle(option.value)}
              whileTap={{ scale: 0.96 }}
              className={`flex items-center gap-2 rounded-bubble border px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                isSelected
                  ? 'border-marigold bg-marigold-wash text-ink'
                  : 'border-paper-edge bg-white text-ink-soft hover:border-ink-faint'
              }`}
            >
              <span
                className={`grid h-3.5 w-3.5 place-items-center rounded-bubble border transition-colors ${
                  isSelected ? 'border-marigold' : 'border-ink-faint/50'
                }`}
              >
                {isSelected ? (
                  <motion.span
                    className="h-2 w-2 rounded-bubble bg-marigold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  />
                ) : null}
              </span>
              {option.label}
            </motion.button>
          );
        })}
      </div>

      {error ? <p className="mt-1.5 text-[0.8rem] text-danger">{error}</p> : null}
    </fieldset>
  );
}
