export interface ParsedRange {
  start: number;
  /** Inclusive last byte, as HTTP Content-Range uses. */
  end: number;
}

/**
 * Parses a `Range: bytes=start-end` header against a file of `sizeBytes`.
 *
 * Returns null for "no header" (serve the whole file with 200) and
 * 'unsatisfiable' for a range outside the file (respond 416). Handles the
 * three legal shapes: `bytes=0-499`, `bytes=500-` and `bytes=-500` (suffix).
 * Multi-range requests are not supported — the first range is used.
 */
export function parseRangeHeader(
  header: string | undefined,
  sizeBytes: number,
): ParsedRange | 'unsatisfiable' | null {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)(?:,|$)/.exec(header.trim());
  if (!match) return 'unsatisfiable';

  const [, startRaw, endRaw] = match;
  if (startRaw === '' && endRaw === '') return 'unsatisfiable';

  // Suffix form: last N bytes.
  if (startRaw === '') {
    const suffixLength = Number(endRaw);
    if (suffixLength === 0) return 'unsatisfiable';
    const start = Math.max(0, sizeBytes - suffixLength);
    return sizeBytes === 0 ? 'unsatisfiable' : { start, end: sizeBytes - 1 };
  }

  const start = Number(startRaw);
  const end = endRaw === '' ? sizeBytes - 1 : Math.min(Number(endRaw), sizeBytes - 1);
  if (start >= sizeBytes || start > end) return 'unsatisfiable';
  return { start, end };
}
