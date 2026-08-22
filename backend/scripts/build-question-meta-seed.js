/**
 * Generates `seeds/012_question_subject_section.sql` from `data/mock_tests/*.json`.
 *
 * The full-length mocks are one paper of 180 questions covering four subjects,
 * but `questions` only ever stored a position. The source JSON has carried the
 * per-question `subject` all along, so this backfills it rather than guessing
 * from position ranges.
 *
 * Section is derived, not sourced: NEET splits each subject's 45 questions into
 * Section A (the first 35, all compulsory) and Section B (the last 10, attempt
 * any 10). Subjects that are not 45 questions long get Section A throughout —
 * an invented Section B would be a lie on the screen.
 *
 * Usage: node scripts/build-question-meta-seed.js
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = join(root, 'data', 'mock_tests');
const outFile = join(root, 'seeds', '012_question_subject_section.sql');

const SECTION_A_COUNT = 35;
const NEET_SUBJECT_SIZE = 45;

/** `MT-07.json` -> the UUID seeds/006_mock_tests.sql gave that paper. */
function testIdForSlug(slug) {
  const n = Number(slug.replace(/^MT-/, ''));
  if (!Number.isInteger(n) || n < 1) throw new Error(`Cannot derive a test id from slug "${slug}"`);
  return `32000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** Section A for the first 35 of a 45-question subject, B for the rest. */
function sectionsFor(questions) {
  const ordered = [...questions].sort((a, b) => a.position - b.position);
  const full = ordered.length === NEET_SUBJECT_SIZE;
  return new Map(
    ordered.map((q, index) => [q.position, full && index >= SECTION_A_COUNT ? 'B' : 'A']),
  );
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function main() {
  const files = (await readdir(testsDir)).filter((f) => /^MT-\d+\.json$/.test(f)).sort();
  if (files.length === 0) throw new Error(`No MT-*.json files in ${testsDir}`);

  const blocks = [];
  let totalRows = 0;

  for (const file of files) {
    const paper = JSON.parse(await readFile(join(testsDir, file), 'utf8'));
    const slug = paper.slug ?? file.replace(/\.json$/, '');
    const testId = testIdForSlug(slug);

    // Section is per subject, so bucket by subject before deriving it.
    const bySubject = new Map();
    for (const question of paper.questions) {
      if (!question.subject) continue;
      const bucket = bySubject.get(question.subject) ?? [];
      bucket.push(question);
      bySubject.set(question.subject, bucket);
    }

    const rows = [];
    for (const [subject, questions] of bySubject) {
      const sections = sectionsFor(questions);
      for (const question of questions) {
        rows.push(`    (${question.position}, ${sqlString(subject)}, ${sqlString(sections.get(question.position))})`);
      }
    }
    if (rows.length === 0) continue;

    rows.sort((a, b) => Number(a.trim().slice(1).split(',')[0]) - Number(b.trim().slice(1).split(',')[0]));
    totalRows += rows.length;

    blocks.push(
      `-- ${paper.title ?? slug} — ${rows.length} questions\n` +
        `UPDATE questions AS q\n` +
        `   SET subject = v.subject,\n` +
        `       section = v.section\n` +
        `  FROM (VALUES\n${rows.join(',\n')}\n` +
        `  ) AS v (position, subject, section)\n` +
        ` WHERE q.test_id = '${testId}'\n` +
        `   AND q.position = v.position;`,
    );
  }

  const sql =
    `-- Per-question subject and Section A/B for the NEET full-length mocks.\n` +
    `-- Generated from backend/data/mock_tests/*.json by\n` +
    `-- scripts/build-question-meta-seed.js — do not hand-edit.\n` +
    `--\n` +
    `-- Plain UPDATEs, so this is safe to re-run: it sets the same values again.\n` +
    `-- Requires migration 0012.\n\n` +
    `${blocks.join('\n\n')}\n`;

  await writeFile(outFile, sql, 'utf8');
  console.error(`Wrote ${outFile} — ${blocks.length} test(s), ${totalRows} questions.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
