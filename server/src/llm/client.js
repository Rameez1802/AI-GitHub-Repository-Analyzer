import { config } from '../config.js';
import { AppError } from '../errors.js';

export function llmStatus() {
  const { provider, anthropicKey, anthropicModel, openaiKey, openaiModel, openaiBaseUrl } = config.llm;
  if (provider === 'anthropic' && anthropicKey) return { configured: true, provider, model: anthropicModel };
  if (provider === 'openai' && (openaiKey || !/api\.openai\.com/.test(openaiBaseUrl))) return { configured: true, provider, model: openaiModel, baseUrl: openaiBaseUrl };
  return { configured: false, provider: 'none', model: null };
}

async function post(url, headers, body, model) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.llm.timeoutMs);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });
  } catch (cause) {
    throw new AppError('LLM_NETWORK', { providerMessage: cause.name === 'AbortError' ? `no answer within ${config.llm.timeoutMs / 1000}s` : cause.message }, cause);
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return res.json();
  let message = '';
  try { const j = await res.json(); message = j.error?.message ?? j.message ?? ''; } catch { /* body was not JSON */ }
  if (res.status === 401 || res.status === 403) throw new AppError('LLM_AUTH', { providerMessage: message });
  if (res.status === 404 || (res.status === 400 && /model/i.test(message))) throw new AppError('LLM_MODEL', { model, providerMessage: message });
  if (res.status === 429) throw new AppError('LLM_RATE_LIMIT', { providerMessage: message });
  throw new AppError('LLM_ERROR', { status: res.status, providerMessage: message });
}

/** Sends one grounded prompt and returns the model's text. */
export async function complete({ system, user, maxTokens = 1200 }) {
  const status = llmStatus();
  if (!status.configured) throw new AppError('LLM_AUTH', { providerMessage: 'no key configured' });
  if (status.provider === 'anthropic') {
    const data = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': config.llm.anthropicKey, 'anthropic-version': '2023-06-01' }, { model: status.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }, status.model);
    return (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  }
  const headers = config.llm.openaiKey ? { authorization: `Bearer ${config.llm.openaiKey}` } : {};
  const data = await post(`${config.llm.openaiBaseUrl}/chat/completions`, headers, { model: status.model, max_tokens: maxTokens, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }, status.model);
  return String(data.choices?.[0]?.message?.content ?? '').trim();
}
