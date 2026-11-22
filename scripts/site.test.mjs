import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleEnquiry, makeWorker } from '../worker/handler.mjs';
import { createLocalDb } from './local-db.mjs';
const valid = () => ({ id: crypto.randomUUID(), name: 'Website Test', email: 'test@example.com', organization: 'QA', reason: 'Pilot participation', message: 'This is a local test enquiry.', consent: true, website: '' });
const request = (data, overrides = {}) => new Request('http://localhost/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost', ...overrides }, body: JSON.stringify(data) });
test('enquiry persists correctly, preserves user text, and retries do not duplicate it', async () => {
  const db = createLocalDb(); try { const data = valid(); data.message = "I'm interested in STEWARD; DROP TABLE enquiries; <script>test</script>"; const response = await handleEnquiry(request(data), { DB: db.binding }); assert.equal(response.status, 201); const result = await response.json(); assert.match(result.reference, /^LL-[A-F0-9]{8}$/); const retry = await handleEnquiry(request(data), { DB: db.binding }); assert.equal(retry.status, 200); assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n, 1); assert.equal(db.sqlite.prepare('SELECT message FROM enquiries').get().message, data.message); } finally { db.sqlite.close(); }
});
test('invalid email, missing consent, invalid topic, whitespace, and oversized messages are rejected', async () => {
  const db = createLocalDb(); try { for (const patch of [{ email: 'invalid' }, { consent: false }, { reason: 'unknown' }, { name: '   ' }, { message: 'short' }, { message: 'a'.repeat(5001) }, { id: 'bad-id' }, { website: 'spam' }]) { const result = await handleEnquiry(request({ ...valid(), ...patch }), { DB: db.binding }); assert.equal(result.status, 400); } assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM enquiries').get().n, 0); } finally { db.sqlite.close(); }
});
test('API rejects cross-origin writes, wrong methods and unavailable storage', async () => {
  assert.equal((await handleEnquiry(request(valid(), { Origin: 'https://other.example' }), {})).status, 403);
  assert.equal((await handleEnquiry(new Request('http://localhost/api/enquiries'), {})).status, 405);
  assert.equal((await handleEnquiry(request(valid()), {})).status, 503);
  assert.equal((await handleEnquiry(new Request('http://localhost/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), {})).status, 400);
});
test('email rate limiting caps new submissions and permits safe retries', async () => {
  const db = createLocalDb(); try { const data = valid(); for (let i = 0; i < 5; i++) { data.id = crypto.randomUUID(); assert.equal((await handleEnquiry(request(data), { DB: db.binding })).status, 201); } assert.equal((await handleEnquiry(request(data), { DB: db.binding })).status, 200); data.id = crypto.randomUUID(); assert.equal((await handleEnquiry(request(data), { DB: db.binding })).status, 429); } finally { db.sqlite.close(); }
});
test('asset routes have security headers, HEAD works, and unknown files stay private', async () => {
  const worker = makeWorker({ '/index.html': { body: 'Lumen Labs', type: 'text/html', encoding: 'utf8' } });
  const response = await worker.fetch(new Request('http://localhost/'), {}); assert.equal(response.status, 200); assert.equal(await response.text(), 'Lumen Labs'); assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(await (await worker.fetch(new Request('http://localhost/', { method: 'HEAD' }), {})).text(), '');
  assert.equal((await worker.fetch(new Request('http://localhost/.openai/hosting.json'), {})).status, 404);
  assert.equal((await worker.fetch(new Request('http://localhost/api/enquiries'), {})).status, 405);
});
test('all internal links and ARIA references point to unique elements', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/\bhref="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), `Missing anchor ${match[1]}`);
  for (const match of html.matchAll(/\baria-(?:controls|labelledby)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id), `Missing ARIA reference ${id}`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1); assert.ok(!html.includes('BEACON')); assert.ok(!html.includes('alert('));
});
