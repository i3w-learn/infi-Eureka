/**
 * Turns the two library JSON catalogues into seeds/009_library.sql.
 *
 *   data/formula_sheets/index.json   -> kind 'formula_sheet'
 *   data/ncert_highlights/index.json -> kind 'ncert_highlight'
 *
 * Ids are derived from the slug rather than random, so re-running produces the
 * same rows and the seed stays safe to apply twice.
 *
 * Usage: node scripts/build-library-seed.js
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/** A stable UUIDv5-shaped id derived from the kind and slug. */
function idFor(kind, slug) {
  const hex = createHash('sha1').update(`${kind}:${slug}`).digest('hex');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function load(path, key) {
  const parsed = JSON.parse(await readFile(join(backendDir, path), 'utf8'));
  return parsed[key];
}

async function main() {
  const sheets = await load('data/formula_sheets/index.json', 'sheets');
  const highlights = await load('data/ncert_highlights/index.json', 'highlights');

  const rows = [
    ...sheets.map((s) => ({
      kind: 'formula_sheet',
      slug: s.slug,
      title: s.title,
      subject: s.subject,
      grade: s.grade,
      chapterNumber: null,
      url: s.url,
      sizeBytes: s.sizeBytes,
    })),
    ...highlights.map((h) => ({
      kind: 'ncert_highlight',
      slug: h.slug,
      title: h.title,
      subject: h.subject,
      grade: h.grade,
      chapterNumber: h.chapterNumber ?? null,
      url: h.url,
      sizeBytes: h.sizeBytes,
    })),
  ];

  // One free sample per kind: the first row of each, which after the JSON's own
  // sort is the lowest chapter of the alphabetically first subject.
  const freeSlugs = new Set();
  for (const kind of ['formula_sheet', 'ncert_highlight']) {
    const first = rows.find((r) => r.kind === kind);
    if (first) freeSlugs.add(`${kind}:${first.slug}`);
  }

  const values = rows
    .map((r) => {
      const isFree = freeSlugs.has(`${r.kind}:${r.slug}`);
      return (
        `  (${quote(idFor(r.kind, r.slug))}, ${quote(r.kind)}, ${quote(r.slug)}, ${quote(r.title)},\n` +
        `   ${quote(r.subject)}, ${r.grade}, ${r.chapterNumber ?? 'NULL'}, ${quote(r.url)}, ${r.sizeBytes}, ${isFree})`
      );
    })
    .join(',\n');

  const sql = `-- Formula sheets and NCERT Highlights: PDFs hosted in GCS.
-- Generated from data/formula_sheets/index.json and data/ncert_highlights/index.json
-- by scripts/build-library-seed.js — do not hand-edit.
--
-- ${sheets.length} formula sheets + ${highlights.length} NCERT Highlights chapters.
-- One row per kind is flagged is_free_sample so a locked student can open it.

INSERT INTO library_documents
  (id, kind, slug, title, subject, grade, chapter_number, url, size_bytes, is_free_sample)
VALUES
${values}
ON CONFLICT (id) DO UPDATE
    SET title          = EXCLUDED.title,
        subject        = EXCLUDED.subject,
        grade          = EXCLUDED.grade,
        chapter_number = EXCLUDED.chapter_number,
        url            = EXCLUDED.url,
        size_bytes     = EXCLUDED.size_bytes,
        is_free_sample = EXCLUDED.is_free_sample;
`;

  const out = join(backendDir, 'seeds', '009_library.sql');
  await writeFile(out, sql, 'utf8');
  console.error(`${rows.length} rows -> seeds/009_library.sql`);
  console.error(`  formula sheets  : ${sheets.length}`);
  console.error(`  ncert highlights: ${highlights.length}`);
  console.error(`  free samples    : ${[...freeSlugs].join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
