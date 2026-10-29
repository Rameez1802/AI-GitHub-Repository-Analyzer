import { isCodeLine } from './lexer.js';

const WINDOW = 6;

/**
 * Finds blocks of WINDOW or more consecutive significant lines that appear
 * in more than one place. Returns { percent, blocks:[{a:{file,line,endLine}, b:{file,line,endLine}, lines}] }.
 */
export function findDuplicates(files) {
  const windows = new Map(); // hash -> [{file, idx}]
  const sig = new Map(); // file -> [{n, norm}]
  let total = 0;

  for (const f of files) {
    const rows = [];
    for (const l of f.lines) {
      if (!isCodeLine(l)) continue;
      const norm = l.code.trim().replace(/\s+/g, ' ');
      if (norm.length < 12 || /^[\]})\[{(;,]+$/.test(norm) || /^(import|from|using|package|#include)\b/.test(norm)) continue;
      rows.push({ n: l.n, norm });
    }
    sig.set(f.path, rows);
    total += rows.length;
    for (let i = 0; i + WINDOW <= rows.length; i++) {
      const key = rows.slice(i, i + WINDOW).map((r) => r.norm).join('\n');
      if (!windows.has(key)) windows.set(key, []);
      windows.get(key).push({ file: f.path, idx: i });
    }
  }

  const dupFlag = new Map();
  const pairs = [];
  for (const occ of windows.values()) {
    if (occ.length < 2) continue;
    const [a, b] = occ;
    for (const o of occ) {
      if (!dupFlag.has(o.file)) dupFlag.set(o.file, new Set());
      for (let k = 0; k < WINDOW; k++) dupFlag.get(o.file).add(o.idx + k);
    }
    pairs.push({ a, b });
  }

  let dupLines = 0;
  for (const set of dupFlag.values()) dupLines += set.size;

  // merge consecutive windows of the same file pair into blocks
  pairs.sort((x, y) => x.a.file.localeCompare(y.a.file) || x.a.idx - y.a.idx);
  const blocks = [];
  for (const p of pairs) {
    const last = blocks[blocks.length - 1];
    if (last && last.a.file === p.a.file && last.b.file === p.b.file && p.a.idx <= last.aEnd + 1 && p.b.idx <= last.bEnd + 1 && p.b.idx >= last.bStart) {
      last.aEnd = p.a.idx + WINDOW - 1;
      last.bEnd = p.b.idx + WINDOW - 1;
    } else {
      blocks.push({ a: p.a, b: p.b, aStart: p.a.idx, aEnd: p.a.idx + WINDOW - 1, bStart: p.b.idx, bEnd: p.b.idx + WINDOW - 1 });
    }
  }

  const out = blocks.map((bl) => {
    const A = sig.get(bl.a.file), B = sig.get(bl.b.file);
    return {
      a: { file: bl.a.file, line: A[bl.aStart].n, endLine: A[bl.aEnd].n },
      b: { file: bl.b.file, line: B[bl.bStart].n, endLine: B[bl.bEnd].n },
      lines: bl.aEnd - bl.aStart + 1,
    };
  }).sort((x, y) => y.lines - x.lines);

  return { percent: total ? Math.round((dupLines / total) * 1000) / 10 : 0, blocks: out.slice(0, 15), duplicatedLines: dupLines, significantLines: total };
}
