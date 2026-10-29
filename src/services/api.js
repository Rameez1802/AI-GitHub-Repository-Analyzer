// Client for the RepoLens server. Every failure becomes an ApiError with a code,
// a message and a hint that says how to resolve it.
const BASE = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  constructor({ code = 'UNKNOWN', message = 'Something went wrong.', hint = '', status = 0, location = null, details = null, stack = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.hint = hint;
    this.status = status;
    this.location = location; // { file, line, column, text } on the server, when available
    this.details = details;
    this.serverStack = stack;
  }
}

const unreachable = () =>
  new ApiError({
    code: 'SERVER_UNREACHABLE',
    message: 'The analysis server is not reachable.',
    hint: 'Start it with "npm run dev" (this starts the server and the website together) or "npm run dev:server". The terminal should print "RepoLens server http://localhost:8787". If you changed PORT in .env, update the proxy target in vite.config.js to match.',
  });

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw unreachable();
  }
  const isJson = (res.headers.get('content-type') || '').includes('json');
  const data = isJson ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    if (data?.error) throw new ApiError(data.error);
    if (res.status >= 500 && !data) throw unreachable(); // the Vite proxy answers 5xx when nothing listens on the server port
    throw new ApiError({ code: `HTTP_${res.status}`, message: `The server answered with status ${res.status}.`, hint: 'Check the terminal where the server runs for details.', status: res.status });
  }
  return data;
}

export const getHealth = () => request('/api/health');
export const getAnalysis = (id) => request(`/api/analyses/${id}`);
export const askQuestion = (id, question) => request(`/api/analyses/${id}/ask`, { method: 'POST', body: { question } });
export const reportUrl = (id, kind) => `${BASE}/api/analyses/${id}/report.${kind}`;

// React StrictMode runs effects twice in development; sharing the start request avoids two analyses.
const starts = new Map();
export function startAnalysis(input, { fresh = false } = {}) {
  const hit = starts.get(input);
  if (!fresh && hit && Date.now() - hit.at < 3000) return hit.promise;
  const promise = request('/api/analyses', { method: 'POST', body: { url: input } });
  starts.set(input, { at: Date.now(), promise });
  promise.catch(() => starts.delete(input));
  return promise;
}
