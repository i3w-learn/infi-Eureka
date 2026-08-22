/**
 * Drops every table, re-runs all migrations, then re-seeds.
 *
 * This DESTROYS all data in the target database. It refuses to run when
 * NODE_ENV is production, and asks for confirmation unless --force is passed.
 *
 * Usage: npm run db:reset [-- --force]
 */
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import 'dotenv/config';
import pg from 'pg';

/** Runs an npm script without a shell, so nothing can be injected into it. */
function run(script) {
  const result = spawnSync('npm', ['run', script], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`\`npm run ${script}\` failed.`);
  }
}

function describe(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return `${pathname.replace('/', '')} on ${hostname}`;
  } catch {
    return 'the configured database';
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset the database with NODE_ENV=production.');
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set. Copy .env.example to .env.');

  const target = describe(databaseUrl);

  if (!process.argv.includes('--force')) {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    const answer = await rl.question(`This deletes ALL data in ${target}. Type "reset" to continue: `);
    rl.close();
    if (answer.trim() !== 'reset') {
      console.error('Cancelled — nothing was changed.');
      process.exit(1);
    }
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.error(`Dropped every table in ${target}.`);
  } finally {
    await client.end();
  }

  run('migrate:up');
  run('seed');
  console.error('Database reset complete.');
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause) console.error(`  caused by: ${error.cause.message}`);
  process.exit(1);
});
