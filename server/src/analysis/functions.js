import { isCodeLine } from './lexer.js';

const CONTROL = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'else', 'with', 'do', 'try', 'foreach', 'using', 'lock', 'when', 'fixed', 'unless', 'synchronized', 'new', 'throw', 'await', 'typeof', 'sizeof']);

// ---- header detection: returns a function name or null -------------------
const JS_FUNCTION = /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)?\s*\(/;
const JS_ARROW = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:function\b|\([^)]*\)\s*(?::[^=>{]+)?=>|[A-Za-z_$][\w$]*\s*=>)/;
const JS_METHOD = /^\s*(?:(?:public|private|protected|static|async|get|set|readonly|override)\s+)*([A-Za-z_$#][\w$]*)\s*\([^;]*\)\s*(?::\s*[^{;=]+)?\{\s*$/;
const GO_FUNC = /^func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*[\[(]/;
const RUST_FN = /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+([A-Za-z_]\w*)/;
const PHP_FN = /^\s*(?:(?:public|private|protected|static|abstract|final)\s+)*function\s+&?([A-Za-z_]\w*)/;
const GENERIC = /^\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:[\w<>\[\],.?*&:~]+\s+)*?([A-Za-z_~][\w:]*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:throws\s+[\w.,\s]+)?(?::\s*[\w<>\[\]?.]+\s*)?\{?\s*$/;
const PY_DEF = /^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/;

function jsHeader(code) {
  let m = code.match(JS_FUNCTION);
  if (m) return m[1] || '(anonymous)';
  m = code.match(JS_ARROW);
  if (m) return m[1];
  m = code.match(JS_METHOD);
  if (m && !CONTROL.has(m[1])) return m[1];
  return null;
}

function headerFor(langName, code) {
  switch (langName) {
    case 'JavaScript':
    case 'TypeScript':
      return jsHeader(code);
    case 'Go': return (code.match(GO_FUNC) || [])[1] ?? null;
    case 'Rust': return (code.match(RUST_FN) || [])[1] ?? null;
    case 'PHP': return (code.match(PHP_FN) || [])[1] ?? null;
    default: {
      const m = code.match(GENERIC);
      if (!m || CONTROL.has(m[1]) || /^\s*(?:return|else|new|throw|case|delete)\b/.test(code)) return null;
      // require something before the name (a type) for C-family methods, except constructors in classes
      return m[1];
    }
  }
}

function countParams(headerCode) {
  const open = headerCode.indexOf('(');
  if (open < 0) return 0;
  let depth = 0, commas = 0, any = false;
  for (let i = open; i < headerCode.length; i++) {
    const c = headerCode[i];
    if (c === '(' || c === '[' || c === '<' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '>' || c === '}') { depth--; if (depth === 0) break; }
    else if (depth === 1) { if (c === ',') commas++; else if (!/\s/.test(c)) any = true; }
  }
  return any ? commas + 1 : 0;
}

const BRACE_DECISIONS = /\b(?:if|for|while|case|catch|foreach|elif|when)\b|&&|\|\||\?\?|\?\s/g;
const PY_DECISIONS = /\b(?:if|elif|for|while|except|and|or|case)\b/g;

function complexityOf(codeLines, style) {
  const body = codeLines.join('\n');
  const re = style === 'indent' ? PY_DECISIONS : BRACE_DECISIONS;
  return 1 + (body.match(re) || []).length;
}

function finish(lines, start, end, name, langName, headerCode, style, nesting) {
  const slice = lines.slice(start, end + 1);
  const codeLines = slice.filter(isCodeLine).map((l) => l.code);
  return {
    name,
    startLine: lines[start].n,
    endLine: lines[end].n,
    length: codeLines.length,
    complexity: complexityOf(codeLines, style),
    params: countParams(headerCode),
    nesting: Math.max(0, nesting),
  };
}

function bracePass(lines, langName) {
  const found = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i <= skipUntil) continue;
    const code = lines[i].code;
    if (!code.trim()) continue;
    const name = headerFor(langName, code);
    if (!name) continue;

    // find the opening brace on this or the next two code lines
    let open = -1;
    let headerText = code;
    for (let j = i; j <= Math.min(lines.length - 1, i + 2); j++) {
      if (j > i) headerText += ' ' + lines[j].code.trim();
      const hit = lines[j].code.indexOf('{');
      if (hit >= 0) {
        // an arrow function with an expression body has no brace right after =>
        const arrow = lines[j].code.match(/=>\s*(.*)$/);
        if (arrow && !arrow[1].trim().startsWith('{') && j === i) { open = -2; }
        else open = j;
        break;
      }
      if (/;\s*$/.test(lines[j].code)) { open = -2; break; }
    }
    if (open < 0) continue;

    // match braces
    let depth = 0, maxDepth = 0, end = -1, started = false;
    for (let j = open; j < lines.length; j++) {
      const text = j === open ? lines[j].code.slice(lines[j].code.indexOf('{')) : lines[j].code;
      for (const c of text) {
        if (c === '{') { depth++; started = true; if (depth > maxDepth) maxDepth = depth; }
        else if (c === '}') { depth--; if (started && depth === 0) { end = j; break; } }
      }
      if (end >= 0) break;
    }
    if (end < 0) continue;
    found.push(finish(lines, i, end, name, langName, headerText, 'brace', maxDepth - 1));
    skipUntil = end; // do not count nested callbacks as separate functions
  }
  return found;
}

function indentOf(raw) {
  const m = raw.match(/^[ \t]*/)[0];
  return m.replace(/\t/g, '    ').length;
}

function pythonPass(lines) {
  const found = [];
  let skipUntil = -1;
  for (let i = 0; i < lines.length; i++) {
    if (i <= skipUntil) continue;
    const m = lines[i].code.match(PY_DEF);
    if (!m) continue;
    const baseIndent = indentOf(lines[i].raw);
    // join a multi-line signature
    let headerText = lines[i].code;
    let j = i;
    while (!/:\s*$/.test(lines[j].code) && j < Math.min(lines.length - 1, i + 8)) { j++; headerText += ' ' + lines[j].code.trim(); }
    let end = j;
    let maxIndent = baseIndent;
    for (let k = j + 1; k < lines.length; k++) {
      if (lines[k].blank || !isCodeLine(lines[k])) { continue; }
      const ind = indentOf(lines[k].raw);
      if (ind <= baseIndent) break;
      end = k;
      if (ind > maxIndent) maxIndent = ind;
    }
    const unit = 4;
    found.push(finish(lines, i, end, m[2], 'Python', headerText, 'indent', Math.round((maxIndent - baseIndent) / unit) - 1));
    skipUntil = end;
  }
  return found;
}

export function extractFunctions(lines, lang) {
  if (!lang || lang.style === 'none') return [];
  try {
    return lang.style === 'indent' ? pythonPass(lines) : bracePass(lines, lang.name);
  } catch {
    return [];
  }
}
