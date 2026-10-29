// Exercises the model path against a fake OpenAI-compatible server (the same protocol Ollama speaks).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

let mode = 'good';
const requests = [];
const fake = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    const json = JSON.parse(body || '{}');
    requests.push({ url: req.url, auth: req.headers.authorization, json });
    const reply = (status, payload) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload)); };
    if (mode === 'auth') return reply(401, { error: { message: 'Incorrect API key provided' } });
    if (mode === 'model') return reply(404, { error: { message: 'model "nope" not found' } });
    if (mode === 'rate') return reply(429, { error: { message: 'quota exceeded' } });
    const system = json.messages[0].content, user = json.messages[1].content;
    if (/Return ONLY a JSON object/.test(user)) {
      if (mode === 'garbage') return reply(200, { choices: [{ message: { content: 'Sorry, I cannot do that.' } }] });
      return reply(200, { choices: [{ message: { content: 'Here you go:\n' + JSON.stringify({ overview: ['A tiny shop demo that formats prices. See [src/utils/format.js:5-12].'], architecture: ['Entry point is [src/index.js:1-8]; it calls [src/ghost/missing.js:1-3].'], strengths: [{ text: 'Has a README', source: 'D' }], risks: [{ text: 'Hard-coded AWS key', source: 'app/server.py:6' }] }) } }] });
    }
    assert.match(system, /Use ONLY the FACTS and EVIDENCE/);
    return reply(200, { choices: [{ message: { content: 'Currency formatting is in formatValue [src/utils/format.js:5-20]. Also see [src/nowhere.js:9-9].' } }] });
  });
});
await new Promise((r) => fake.listen(0, r));
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${fake.address().port}/v1`;
process.env.OPENAI_API_KEY = 'test-key';
process.env.OPENAI_MODEL = 'fake-model';
process.env.LLM_PROVIDER = 'openai';

const { analyseRepository } = await import('../src/analysis/engine.js');
const { LocalSource } = await import('../src/sources/local.js');
const { llmSummary } = await import('../src/llm/summarize.js');
const { answerQuestion } = await import('../src/llm/qa.js');
const { llmStatus } = await import('../src/llm/client.js');
const { FIXTURE } = await import('./helpers.js');

const { result, internal } = await analyseRepository(new LocalSource(FIXTURE, { name: 'sample-shop' }), { osvEnabled: false });
test.after(() => fake.close());

test('status reports the configured model', () => {
  assert.deepEqual(llmStatus(), { configured: true, provider: 'openai', model: 'fake-model', baseUrl: process.env.OPENAI_BASE_URL });
});

test('summary: prompt is grounded, JSON is parsed, citations are verified', async () => {
  mode = 'good'; requests.length = 0;
  const s = await llmSummary(result, internal);
  assert.equal(s.mode, 'llm');
  assert.equal(s.model, 'fake-model');
  assert.match(s.overview[0], /tiny shop/);
  assert.equal(requests[0].auth, 'Bearer test-key');
  const prompt = requests[0].json.messages[1].content;
  assert.match(prompt, /FACTS:/); assert.match(prompt, /EVIDENCE:/); assert.match(prompt, /\[src\/[\w./]+:\d+-\d+\]/, 'evidence headers carry file and lines');
  assert.ok(s.citations.some((c) => c.file === 'src/utils/format.js'), 'real citation accepted');
  assert.ok(s.unverifiedCitations.includes('[src/ghost/missing.js:1-3]'), 'invented file is flagged');
});

test('question answering: model answer, verified and unverified citations, evidence kept', async () => {
  mode = 'good';
  const a = await answerQuestion({ question: 'where is currency formatting handled', result, internal });
  assert.equal(a.mode, 'llm');
  assert.deepEqual(a.citations.map((c) => c.file), ['src/utils/format.js']);
  assert.deepEqual(a.unverifiedCitations, ['[src/nowhere.js:9-9]']);
  assert.ok(a.evidence.length > 0);
});

test('provider failures map to the right error codes with hints', async () => {
  for (const [m, code] of [['auth', 'LLM_AUTH'], ['model', 'LLM_MODEL'], ['rate', 'LLM_RATE_LIMIT'], ['garbage', 'LLM_BAD_OUTPUT']]) {
    mode = m;
    await assert.rejects(() => llmSummary(result, internal), (e) => e.code === code && e.hint.length > 10, `${m} -> ${code}`);
  }
});

test('a failing model does not break the analysis job: extractive fallback plus a warning', async () => {
  mode = 'auth';
  const { createServer } = await import('../src/server.js');
  const server = createServer(); await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { id } = await (await fetch(`${base}/api/analyses`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'demo' }) })).json();
  let job; for (let i = 0; i < 100; i++) { job = await (await fetch(`${base}/api/analyses/${id}`)).json(); if (job.status === 'done') break; await new Promise((r) => setTimeout(r, 50)); }
  server.close();
  assert.equal(job.status, 'done');
  assert.equal(job.result.summary.mode, 'extractive');
  assert.ok(job.result.warnings.some((w) => w.code === 'LLM_AUTH' && /Incorrect API key/.test(w.message)));
});
