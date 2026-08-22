/**
 * Loads content into the database by running every .sql file in `seeds/`
 * in filename order.
 *
 * Seeds must be safe to run twice — use ON CONFLICT DO NOTHING rather than
 * plain INSERT, so re-seeding a populated database does not error out.
 *
 * Usage: npm run seed
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

const seedsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'seeds');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const files = (await readdir(seedsDir)).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.error('No .sql files in seeds/ — nothing to seed.');
    return;
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const file of files) {
      const sql = await readFile(join(seedsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('COMMIT');
        console.error(`seeded ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Failed seeding ${file}`, { cause: error });
      }
    }
    console.error(`Done — ${files.length} seed file(s) applied.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause) console.error(`  caused by: ${error.cause.message}`);
  process.exit(1);
});
