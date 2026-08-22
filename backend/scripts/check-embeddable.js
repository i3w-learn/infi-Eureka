/**
 * Asks YouTube which of our lectures may be embedded, and records the answer.
 *
 * A video whose owner disabled "playback on other websites" renders as YouTube's
 * "Video unavailable" card inside an iframe, and the failure is invisible to us
 * at runtime — the iframe is cross-origin, so there is no error to catch. So we
 * ask ahead of time and store it: the player then embeds only what will work and
 * streams our own copy for the rest.
 *
 * YouTube's oEmbed endpoint answers this without an API key: 200 means
 * embeddable, 401 means the owner has turned embedding off.
 *
 * Re-run this after adding lectures, or if an owner changes the setting.
 *
 * Usage: node scripts/check-embeddable.js
 */
import 'dotenv/config';
import pg from 'pg';

const OEMBED = 'https://www.youtube.com/oembed';

/** youtu.be/ID · watch?v=ID · live/ID · embed/ID */
function videoId(url) {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/(?:live|embed|shorts)\/([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(url ?? '');
    if (match) return match[1];
  }
  return null;
}

async function isEmbeddable(id) {
  const url = `${OEMBED}?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  const response = await fetch(url);
  if (response.status === 200) return true;
  if (response.status === 401 || response.status === 403) return false;
  // 404 means the video is gone; anything else is YouTube having a bad day.
  // Either way it cannot be embedded right now, so treat it as not embeddable
  // rather than guessing — the stored file still plays.
  return false;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set.');

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const { rows } = await client.query(
      'SELECT id, title, file_path, youtube_url FROM videos WHERE youtube_url IS NOT NULL ORDER BY title',
    );

    let embeddable = 0;
    const blocked = [];

    for (const video of rows) {
      const id = videoId(video.youtube_url);
      const ok = id ? await isEmbeddable(id) : false;
      await client.query('UPDATE videos SET is_embeddable = $1 WHERE id = $2', [ok, video.id]);
      if (ok) embeddable += 1;
      else blocked.push(video);
    }

    console.error(`checked ${rows.length} lectures`);
    console.error(`  embeddable      : ${embeddable}`);
    console.error(`  not embeddable  : ${blocked.length}`);

    const stranded = blocked.filter((v) => !v.file_path);
    if (stranded.length > 0) {
      console.error('');
      console.error(`WARNING: ${stranded.length} cannot be embedded AND have no stored file.`);
      console.error('These will not play at all:');
      for (const v of stranded) console.error(`  - ${v.title}`);
    } else if (blocked.length > 0) {
      console.error('');
      console.error('All of those have a stored file, so they stream from us instead.');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
