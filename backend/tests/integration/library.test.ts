import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { query, closePool } from '../../src/config/db.js';

/**
 * Proves the paywall shape for the PDF library: everyone signed in can browse
 * titles, only payment (or the free sample) yields the PDF link.
 */
describe('library routes', () => {
  let app: FastifyInstance;
  let lockedToken: string;
  let premiumToken: string;
  const userIds: string[] = [];
  let freeId: string;
  let freeUrl: string;
  let paidId: string;

  async function makeUser(name: string, premium: boolean): Promise<string> {
    const { rows } = await query<{ id: string }>(
      'INSERT INTO users (name, phone, is_premium) VALUES ($1, $2, $3) RETURNING id',
      [name, `+9198760${String(10000 + userIds.length)}`, premium],
    );
    userIds.push(rows[0]!.id);
    return rows[0]!.id;
  }

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    lockedToken = app.jwt.sign({ sub: await makeUser('Library Locked', false) });
    premiumToken = app.jwt.sign({ sub: await makeUser('Library Premium', true) });

    // The seed already flags one free sample per kind, and a unique index
    // allows only one — so use the real row rather than inserting a rival.
    const free = await query<{ id: string; url: string }>(
      `SELECT id, url FROM library_documents WHERE kind = 'formula_sheet' AND is_free_sample LIMIT 1`,
    );
    freeId = free.rows[0]!.id;
    freeUrl = free.rows[0]!.url;

    const paid = await query<{ id: string }>(
      `INSERT INTO library_documents (kind, slug, title, subject, grade, url, size_bytes, is_free_sample)
       VALUES ('formula_sheet', 'test-paid-sheet', 'Paid Sheet', 'physics', 12, 'https://example.com/paid.pdf', 200, FALSE)
       RETURNING id`,
    );
    paidId = paid.rows[0]!.id;
  });

  afterAll(async () => {
    await query('DELETE FROM library_documents WHERE slug = $1', ['test-paid-sheet']);
    await query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    await app.close();
    await closePool();
  });

  it('lets a locked student browse titles without leaking any PDF link', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/library?kind=formula_sheet',
      headers: { authorization: `Bearer ${lockedToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().length).toBeGreaterThan(0);
    // The response schema strips `url`, so no link can appear in a catalogue.
    expect(response.body).not.toContain('example.com');
    expect(response.body).not.toContain('storage.googleapis.com');
  });

  it('requires a login to browse at all', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/library?kind=formula_sheet' });
    expect(response.statusCode).toBe(401);
  });

  it('rejects an unknown kind at the schema', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/library?kind=nonsense',
      headers: { authorization: `Bearer ${lockedToken}` },
    });
    expect(response.statusCode).toBe(400);
  });

  it('refuses the link to a locked student', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/library/${paidId}`,
      headers: { authorization: `Bearer ${lockedToken}` },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('PAYMENT_REQUIRED');
  });

  it('opens the free sample for that same locked student', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/library/${freeId}`,
      headers: { authorization: `Bearer ${lockedToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().url).toBe(freeUrl);
  });

  it('opens everything for a premium student', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/library/${paidId}`,
      headers: { authorization: `Bearer ${premiumToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().url).toBe('https://example.com/paid.pdf');
  });

  it('filters by subject and grade', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/library?kind=ncert_highlight&subject=biology&grade=11',
      headers: { authorization: `Bearer ${premiumToken}` },
    });

    expect(response.statusCode).toBe(200);
    const docs = response.json();
    expect(docs.length).toBeGreaterThan(0);
    expect(docs.every((d: { subject: string; grade: number }) => d.subject === 'biology' && d.grade === 11)).toBe(true);
  });
});
