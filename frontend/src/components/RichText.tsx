import { useMemo } from 'react';
import katex from 'katex';

/**
 * Renders question and option text from the mock-test bank.
 *
 * The bank stores content flattened into one string, because the questions
 * table holds plain TEXT. Two things survive that flattening as markers, and
 * this is where they are turned back into something readable:
 *
 *   $...$                  a formula, rendered by KaTeX
 *   [figure: <path>]       a diagram that belongs at this exact point
 *
 * Position matters: a diagram usually sits mid-sentence, so the parts are
 * rendered in order rather than hoisting figures to the end.
 */

/** Splits on $...$ and [figure: ...] while keeping the delimiters' contents. */
const TOKEN = /(\$[^$]*\$|\[figure:[^\]]*\])/g;

type Part =
  | { kind: 'text'; value: string }
  | { kind: 'math'; value: string }
  | { kind: 'figure'; value: string };

function parse(raw: string): Part[] {
  return raw
    .split(TOKEN)
    .filter((chunk) => chunk !== '')
    .map((chunk): Part => {
      if (chunk.startsWith('$') && chunk.endsWith('$') && chunk.length > 1) {
        return { kind: 'math', value: chunk.slice(1, -1) };
      }
      if (chunk.startsWith('[figure:')) {
        return { kind: 'figure', value: chunk.slice(8, -1).trim() };
      }
      return { kind: 'text', value: chunk };
    });
}

/**
 * KaTeX throws on malformed input. A broken formula must never blank out the
 * question, so it falls back to showing the source — wrong-looking, but the
 * student can still read and answer it.
 *
 * The result is injected as HTML, which is only safe because of `trust: false`:
 * that makes KaTeX escape its input and refuse the commands that can emit a
 * URL or raw markup (`\href`, `\url`, `\includegraphics`), so the output can
 * only ever be KaTeX's own math elements. It is the default, but it is the
 * single thing standing between this and an injection hole, so it is set
 * explicitly — never turn it on.
 */
function renderMath(tex: string): { html: string; ok: boolean } {
  try {
    return {
      html: katex.renderToString(tex, {
        throwOnError: true,
        displayMode: false,
        trust: false,
        strict: false,
      }),
      ok: true,
    };
  } catch {
    return { html: '', ok: false };
  }
}

interface RichTextProps {
  children: string;
  className?: string;
}

export function RichText({ children, className }: RichTextProps) {
  const parts = useMemo(() => parse(children ?? ''), [children]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.kind === 'text') return <span key={i}>{part.value}</span>;

        if (part.kind === 'math') {
          const { html, ok } = renderMath(part.value);
          return ok ? (
            <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code key={i} className="rounded bg-paper-warm px-1 text-[0.9em]">
              {part.value}
            </code>
          );
        }

        return <Figure key={i} src={part.value} />;
      })}
    </span>
  );
}

/**
 * The figure files are not in the app yet, so this names the missing diagram
 * rather than showing a broken image. It becomes an <img> the moment the
 * figures folder is in place.
 */
function Figure({ src }: { src: string }) {
  const name = src.split('/').pop() ?? src;
  return (
    <span className="my-2 flex items-center gap-2 rounded-xl border border-dashed border-paper-edge bg-paper-warm px-3 py-2 text-ink-faint">
      <span aria-hidden="true">🖼</span>
      <span className="text-[0.8rem]">
        Diagram not available yet
        <span className="ml-1 opacity-60">({name})</span>
      </span>
    </span>
  );
}
