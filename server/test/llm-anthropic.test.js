// Checks the Anthropic request shape and error mapping with a stubbed network.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-1234567890';
process.env.ANTHROPIC_MODEL = 'test-model';
process.env.LLM_PROVIDER = 'anthropic';

const realFetch = globalThis.fetch;
let status = 200, seen;
globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.anthropic.com/')) {
    seen = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
    return { ok: status === 200, status, json: async () => (status === 200 ? { content: [{ type: 'text', text: 'It is organised in two modules [src/index.js:1-5].' }] } : { error: { message: 'invalid x-api-key' } }) };
  }
  return realFetch(url, init);
};

const { complete, llmStatus } = await import('../src/llm/client.js');

test('request has the Anthropic headers, model, system prompt and message', async () => {
  const text = await complete({ system: 'SYS', user: 'USER', maxTokens: 321 });
  assert.equal(text, 'It is organised in two modules [src/index.js:1-5].');
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.headers['x-api-key'], 'sk-ant-test-key-1234567890');
  assert.equal(seen.headers['anthropic-version'], '2023-06-01');
  assert.deepEqual(seen.body, { model: 'test-model', max_tokens: 321, system: 'SYS', messages: [{ role: 'user', content: 'USER' }] });
  assert.equal(llmStatus().provider, 'anthropic');
});

test('401 becomes LLM_AUTH', async () => {
  status = 401;
  await assert.rejects(() => complete({ system: 's', user: 'u' }), (e) => e.code === 'LLM_AUTH' && /ANTHROPIC_API_KEY/.test(e.hint));
});

test('a network failure becomes LLM_NETWORK', async () => {
  const f = globalThis.fetch; globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(() => complete({ system: 's', user: 'u' }), (e) => e.code === 'LLM_NETWORK');
  globalThis.fetch = f;
});
