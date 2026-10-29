import { search } from '../retrieval/bm25.js';

/** Finds [path:start-end] citations in text and checks each against what was actually analysed. */
export function verifyCitations(text, index) {
  const ranges = new Map();
  for (const c of index.chunks) {
    const r = ranges.get(c.file) ?? { min: Infinity, max: 0 };
    r.min = Math.min(r.min, c.startLine); r.max = Math.max(r.max, c.endLine);
    ranges.set(c.file, r);
  }
  const valid = [], invalid = [];
  const seen = new Set();
  for (const m of String(text).matchAll(/\[([\w@./+-]+\.\w+):(\d+)(?:-(\d+))?\]/g)) {
    const key = m[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const start = Number(m[2]), end = Number(m[3] ?? m[2]);
    const r = ranges.get(m[1]);
    if (r && start >= 1 && end >= start && start <= r.max) valid.push({ file: m[1], startLine: start, endLine: Math.min(end, r.max) });
    else invalid.push(key);
  }
  return { valid, invalid };
}

export const header = (c) => `[${c.file}:${c.startLine}-${c.endLine}]`;

export function evidenceBlock(hits, maxChars = 1300) {
  return hits.map((h) => `${header(h)}\n${h.text.slice(0, maxChars)}`).join('\n\n---\n\n');
}

export const SYSTEM_RULES = [
  'You are a careful software analyst. You are given FACTS (computed by static analysis and the GitHub API) and EVIDENCE (excerpts of the repository).',
  'Use ONLY the FACTS and EVIDENCE. Never use outside knowledge about this project or similar projects.',
  'Cite code evidence as [path:start-end] using exactly the path and line numbers shown in the evidence headers.',
  'If something is not in the FACTS or EVIDENCE, say "not found in the analysed files". Do not guess.',
  'Never contradict a number in FACTS.',
].join('\n');

export function retrieveFor(index, queries, perQuery = 4) {
  const seen = new Set(), out = [];
  for (const q of queries) for (const h of search(index, q, perQuery)) {
    const key = `${h.file}:${h.startLine}`;
    if (!seen.has(key)) { seen.add(key); out.push(h); }
  }
  return out;
}
