import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

let server, base;
test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const post = (path, body) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
async function waitDone(id) {
  for (let i = 0; i < 100; i++) {
    const job = await (await fetch(`${base}/api/analyses/${id}`)).json();
    if (job.status === 'done' || job.status === 'error') return job;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('analysis did not finish');
}

test('health endpoint', async () => {
  const body = await (await fetch(`${base}/api/health`)).json();
  assert.equal(body.ok, true);
  assert.ok('llm' in body && 'github' in body);
});

test('demo analysis end to end: start, poll, ask, export', async () => {
  const start = await post('/api/analyses', { url: 'demo' });
  assert.equal(start.status, 202);
  const { id } = await start.json();
  const job = await waitDone(id);
  assert.equal(job.status, 'done');
  assert.equal(job.result.source.demo, true);
  assert.ok(job.result.findings.length > 10);
  assert.equal(job.result.internal, undefined, 'the search index is never sent to the browser');

  const ask = await (await post(`/api/analyses/${id}/ask`, { question: 'Are there any secrets or security problems?' })).json();
  assert.equal(ask.mode, 'extractive');
  assert.match(ask.answer, /security findings/);

  const code = await (await post(`/api/analyses/${id}/ask`, { question: 'where is currency formatting handled' })).json();
  assert.ok(code.evidence.some((e) => e.file === 'src/utils/format.js'));

  const md = await fetch(`${base}/api/analyses/${id}/report.md`);
  assert.equal(md.status, 200);
  const text = await md.text();
  assert.match(text, /app\/server\.py:6/);
  assert.match(text, /How to fix/);
});

test('errors have a code, a message and a hint', async () => {
  const bad = await post('/api/analyses', { url: 'not a repo' });
  assert.equal(bad.status, 400);
  const body = (await bad.json()).error;
  assert.equal(body.code, 'INVALID_INPUT');
  assert.ok(body.hint.length > 10);

  const missing = await fetch(`${base}/api/analyses/00000000-0000-0000-0000-000000000000`);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'ANALYSIS_NOT_FOUND');

  const notJson = await fetch(`${base}/api/analyses`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal((await notJson.json()).error.code, 'BAD_JSON');

  const route = await fetch(`${base}/api/nothing`);
  assert.equal((await route.json()).error.code, 'ROUTE_NOT_FOUND');
});

test('empty question is rejected', async () => {
  const { id } = await (await post('/api/analyses', { url: 'demo' })).json();
  await waitDone(id);
  const r = await post(`/api/analyses/${id}/ask`, { question: '   ' });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error.code, 'QUESTION_EMPTY');
});
