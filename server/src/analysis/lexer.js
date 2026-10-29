/**
 * Splits source text into per-line records while ignoring what is inside
 * comments and strings, so later rules count real code only.
 *
 * Each line: { n, raw, code, comment, blank }
 *   code    – the line with comments removed and string contents blanked ("abc" -> "")
 *   comment – the comment text found on the line (used for TODO detection and comment ratio)
 * Line numbers are 1-based and always match the original file.
 */
export function scan(text, lang = {}) {
  const src = String(text).replace(/\r\n?/g, '\n');
  const rawLines = src.split('\n');
  const lineMarks = lang.line ?? [];
  const out = [];

  let state = 'code'; // code | block | triple | tripleComment | template
  let quote = '';

  for (let ln = 0; ln < rawLines.length; ln++) {
    const raw = rawLines[ln];
    let code = '';
    let comment = '';
    let i = 0;

    while (i < raw.length) {
      const ch = raw[i];
      const rest = raw.slice(i);

      if (state === 'block') {
        const end = raw.indexOf('*/', i);
        if (end === -1) { comment += raw.slice(i); i = raw.length; } else { comment += raw.slice(i, end); i = end + 2; state = 'code'; }
        continue;
      }
      if (state === 'triple' || state === 'tripleComment') {
        const end = raw.indexOf(quote, i);
        const target = state === 'tripleComment' ? 'comment' : 'code';
        if (end === -1) { if (target === 'comment') comment += raw.slice(i); i = raw.length; } else { if (target === 'comment') comment += raw.slice(i, end); i = end + 3; state = 'code'; }
        continue;
      }
      if (state === 'template') {
        if (ch === '\\') { i += 2; continue; }
        if (ch === '`') { code += '`'; state = 'code'; }
        i += 1;
        continue;
      }

      // state === 'code'
      if (lang.block && rest.startsWith('/*')) { state = 'block'; i += 2; continue; }
      const mark = lineMarks.find((m) => rest.startsWith(m));
      if (mark) { comment += raw.slice(i + mark.length); i = raw.length; continue; }
      if (lang.triple && (rest.startsWith('"""') || rest.startsWith("'''"))) {
        quote = rest.slice(0, 3);
        state = code.trim() === '' ? 'tripleComment' : 'triple';
        i += 3;
        continue;
      }
      if (ch === '"' || ch === "'" || (ch === '`' && lang.template)) {
        if (ch === '`') { code += '`'; state = 'template'; i += 1; continue; }
        // single-line string: skip to the matching quote, honouring escapes
        let j = i + 1;
        let closed = false;
        while (j < raw.length) {
          if (raw[j] === '\\') { j += 2; continue; }
          if (raw[j] === ch) { closed = true; break; }
          j += 1;
        }
        if (closed) { code += ch + ch; i = j + 1; } else { code += ch; i += 1; }
        continue;
      }
      code += ch;
      i += 1;
    }

    code = code.replace(/\s+$/, '');
    out.push({ n: ln + 1, raw, code, comment: comment.trim(), blank: raw.trim() === '' });
  }
  return out;
}

export const isCodeLine = (l) => l.code.trim() !== '';
