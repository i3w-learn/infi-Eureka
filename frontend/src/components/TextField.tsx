import { useId, useState, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  /** Shown faintly next to the label, e.g. "optional". */
  tag?: string;
  /** Shown under the field when the value is wrong. Also marks the input invalid. */
  error?: string | undefined;
  /** Shown under the field when there is no error. */
  hint?: string;
}

export function TextField({ label, tag, error, hint, type = 'text', ...props }: TextFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && revealed ? 'text' : type;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {tag ? <span className="ml-2 text-[0.75rem] font-normal text-ink-faint">{tag}</span> : null}
      </label>

      <div className="relative mt-1.5">
        <input
          {...props}
          id={id}
          type={inputType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-xl border bg-white px-3.5 py-3 text-[0.95rem] text-ink transition-all duration-200 placeholder:text-ink-faint focus:outline-none ${
            error
              ? 'border-danger'
              : 'border-paper-edge hover:border-ink-faint focus:border-marigold focus:shadow-[0_0_0_4px_rgba(239,113,38,0.12)]'
          } ${isPassword ? 'pr-12' : ''}`}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-bubble border border-paper-edge transition-colors hover:border-marigold"
          >
            {/* The answer bubble again: filled means the password is showing. */}
            <span
              className={`h-3 w-3 rounded-bubble transition-all ${
                revealed ? 'bg-marigold' : 'bg-transparent ring-1 ring-ink-faint'
              }`}
            />
            <span className="sr-only">{revealed ? 'Hide password' : 'Show password'}</span>
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8rem] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.8rem] text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
