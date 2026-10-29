import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'sample-repo');
export const fixtureText = (p) => fs.readFileSync(path.join(FIXTURE, p), 'utf8');
/** 1-based line number of the first line containing `needle` in a fixture file. */
export const lineOf = (p, needle) => fixtureText(p).split('\n').findIndex((l) => l.includes(needle)) + 1;

export function mockResponse(status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body ?? '');
  return { ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[k.toLowerCase()] ?? null }, json: async () => (typeof body === 'string' ? JSON.parse(body) : body), text: async () => text };
}

/** A tiny fake GitHub (and OSV) for tests. `routes` maps URL substrings to responses. */
export function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push(String(url));
    for (const [needle, value] of routes) if (String(url).includes(needle)) return typeof value === 'function' ? value(url, init) : value;
    return mockResponse(404, { message: 'Not Found' });
  };
  fn.calls = calls;
  return fn;
}
