import { isCodeLine } from '../analysis/lexer.js';

const SIZE = 40;
const OVERLAP = 8;

/** Splits analysed files into overlapping line windows that keep their line numbers. */
export function chunkFiles(files, docs = []) {
  const chunks = [];
  for (const f of files) {
    const rows = f.lines;
    for (let start = 0; start < rows.length; start += SIZE - OVERLAP) {
      const slice = rows.slice(start, start + SIZE);
      if (!slice.some(isCodeLine)) continue;
      chunks.push({ file: f.path, startLine: slice[0].n, endLine: slice[slice.length - 1].n, text: slice.map((l) => l.raw).join('\n'), kind: 'code' });
      if (start + SIZE >= rows.length) break;
    }
  }
  for (const d of docs) {
    const parts = d.text.split(/\n(?=#{1,3}\s)/);
    let line = 1;
    for (const part of parts) {
      const count = part.split('\n').length;
      if (part.trim().length > 20) chunks.push({ file: d.path, startLine: line, endLine: line + count - 1, text: part.slice(0, 1800), kind: 'doc' });
      line += count;
    }
  }
  return chunks;
}
