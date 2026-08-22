import { describe, expect, it } from 'vitest';
import { parseRangeHeader } from '../../src/utils/http-range.js';

describe('parseRangeHeader (FR-V-04)', () => {
  it('returns null when there is no header — whole file, 200', () => {
    expect(parseRangeHeader(undefined, 1000)).toBeNull();
  });

  it('parses a bounded range', () => {
    expect(parseRangeHeader('bytes=100-200', 1000)).toEqual({ start: 100, end: 200 });
  });

  it('parses an open-ended range to the last byte', () => {
    expect(parseRangeHeader('bytes=500-', 1000)).toEqual({ start: 500, end: 999 });
  });

  it('parses a suffix range as the last N bytes', () => {
    expect(parseRangeHeader('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
  });

  it('clamps an end past the file to the last byte', () => {
    expect(parseRangeHeader('bytes=0-99999', 1000)).toEqual({ start: 0, end: 999 });
  });

  it('rejects a start beyond the file', () => {
    expect(parseRangeHeader('bytes=1000-1500', 1000)).toBe('unsatisfiable');
  });

  it('rejects a backwards range', () => {
    expect(parseRangeHeader('bytes=200-100', 1000)).toBe('unsatisfiable');
  });

  it('rejects garbage', () => {
    expect(parseRangeHeader('pages=1-2', 1000)).toBe('unsatisfiable');
  });
});
