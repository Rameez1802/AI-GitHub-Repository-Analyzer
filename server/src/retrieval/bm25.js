const STOP = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'it', 'this', 'that', 'what', 'how', 'does', 'do', 'where', 'which', 'with', 'be', 'by', 'as', 'at', 'from', 'me', 'my', 'i', 'can', 'you', 'there', 'about', 'tell', 'show', 'file', 'code']);

export function tokenize(text) {
  const spaced = text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-./\\]/g, ' ');
  return (spaced.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []).filter((t) => !STOP.has(t));
}

export function buildIndex(chunks) {
  const docs = chunks.map((c) => {
    const tokens = tokenize(c.text);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { tf, len: tokens.length, pathTokens: new Set(tokenize(c.file)) };
  });
  const df = new Map();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
  return { chunks, docs, df, avgLen, n: docs.length };
}

export function search(index, query, k = 6) {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length || !index.n) return [];
  const K1 = 1.5, B = 0.75;
  const scored = index.chunks.map((chunk, i) => {
    const d = index.docs[i];
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t);
      if (f) {
        const idf = Math.log(1 + (index.n - (index.df.get(t) ?? 0) + 0.5) / ((index.df.get(t) ?? 0) + 0.5));
        score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (d.len / (index.avgLen || 1)))));
      }
      if (d.pathTokens.has(t)) score += 1.2; // the file name is a strong hint
    }
    return { chunk, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);

  // keep results from different files where possible
  const picked = [], perFile = new Map();
  for (const s of scored) {
    const n = perFile.get(s.chunk.file) ?? 0;
    if (n >= 2) continue;
    perFile.set(s.chunk.file, n + 1);
    picked.push({ file: s.chunk.file, startLine: s.chunk.startLine, endLine: s.chunk.endLine, score: Math.round(s.score * 100) / 100, text: s.chunk.text, kind: s.chunk.kind });
    if (picked.length >= k) break;
  }
  return picked;
}
