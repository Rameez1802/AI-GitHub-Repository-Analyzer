// Findings. Every finding has a file, a line, why it matters, how to fix it,
// and what happens if it is ignored.

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export const RULES = {
  'SEC001': { severity: 'high', category: 'security', title: 'Hard-coded secret',
    why: 'Anyone who can read the repository can use this credential.',
    fix: 'Revoke or rotate the credential now. Remove it from the code and read it from an environment variable (process.env.NAME or os.environ["NAME"]) or a secrets manager. Then remove it from Git history with git filter-repo or BFG, because deleting the line does not delete old commits.',
    ifIgnored: 'The account or service behind the key can be abused. Bots scan public GitHub continuously and use leaked keys within minutes.' },
  'SEC002': { severity: 'medium', category: 'security', title: 'Dynamic code execution',
    why: 'eval-style functions run text as code, so any untrusted input that reaches them becomes remote code execution.',
    fix: 'Replace eval/exec with a safe alternative: JSON.parse for data, a lookup table or function map for dispatch, ast.literal_eval in Python for literals.',
    ifIgnored: 'An attacker who controls the input can run arbitrary code with the permissions of your program.' },
  'SEC003': { severity: 'medium', category: 'security', title: 'Unsafe HTML injection',
    why: 'Writing raw strings into the page lets user input run as script (cross-site scripting).',
    fix: 'Use textContent or your framework’s normal rendering. If raw HTML is unavoidable, sanitise it first with a library such as DOMPurify.',
    ifIgnored: 'Attackers can steal sessions or act as the user on pages that show their input.' },
  'SEC004': { severity: 'medium', category: 'security', title: 'SQL built from strings',
    why: 'Building SQL by concatenation or formatting allows SQL injection.',
    fix: 'Use parameterised queries (placeholders such as ? or %s with a separate values argument) or your ORM’s query builder.',
    ifIgnored: 'An attacker can read, change or delete database data through crafted input.' },
  'SEC005': { severity: 'medium', category: 'security', title: 'TLS certificate checks disabled',
    why: 'Turning off certificate verification removes protection against man-in-the-middle attacks.',
    fix: 'Remove verify=False / rejectUnauthorized:false and install the correct CA certificate instead.',
    ifIgnored: 'Traffic can be intercepted or altered without any error.' },
  'SEC006': { severity: 'medium', category: 'security', title: 'Shell command execution',
    why: 'Running a shell with a string command lets special characters in input change the command.',
    fix: 'Pass the command as a list of arguments without shell=True (Python) or use execFile/spawn with an argument array (Node.js).',
    ifIgnored: 'Crafted input can run extra commands on the server.' },
  'SEC007': { severity: 'medium', category: 'security', title: 'Unsafe deserialisation',
    why: 'pickle.loads and yaml.load can execute code embedded in the data they read.',
    fix: 'Use yaml.safe_load, or a plain format such as JSON. Never unpickle data from outside your own system.',
    ifIgnored: 'A malicious file or message can run code when it is loaded.' },
  'SEC008': { severity: 'high', category: 'security', title: 'Secrets file committed',
    why: 'Files such as .env normally hold passwords and keys and should never be in version control.',
    fix: 'Remove the file from the repository (git rm --cached .env), add it to .gitignore, commit a .env.example with empty values, and rotate every secret it contained.',
    ifIgnored: 'Every secret in the file is exposed to anyone who can read the repository or its history.' },
  'QUAL001': { severity: 'medium', category: 'quality', title: 'Errors silently swallowed',
    why: 'An empty catch block or bare except hides failures, so the program carries on in a broken state.',
    fix: 'Catch the specific error type and handle it, or log it and re-throw. In Python use except SomeError as e: and log e.',
    ifIgnored: 'Bugs become invisible and are much harder to diagnose later.' },
  'QUAL002': { severity: 'low', category: 'quality', title: 'Unfinished work marker (TODO/FIXME)',
    why: 'A TODO or FIXME marks known unfinished work.',
    fix: 'Do the work, or move it to your issue tracker and replace the comment with the issue number.',
    ifIgnored: 'Known problems are forgotten and accumulate as technical debt.' },
  'QUAL003': { severity: 'low', category: 'quality', title: 'Debug output left in code',
    why: 'console.log, print and debugger statements are usually leftovers from debugging.',
    fix: 'Remove them, or replace them with a proper logger that can be switched off in production.',
    ifIgnored: 'Noisy logs can leak data and slow the program; debugger statements pause the app in browsers with devtools open.' },
  'QUAL004': { severity: 'medium', category: 'quality', title: 'Function is too long',
    why: 'Long functions are hard to read, test and change safely.',
    fix: 'Split the function into smaller functions that each do one thing, and give them descriptive names.',
    ifIgnored: 'Changes become risky and bugs hide in the length.' },
  'QUAL005': { severity: 'medium', category: 'quality', title: 'Function is too complex',
    why: 'Many branches make a function hard to understand and need many tests to cover every path.',
    fix: 'Extract branches into helper functions, use early returns to cut nesting, and replace long if/else chains with a lookup table.',
    ifIgnored: 'The function is likely to contain bugs and to break when changed.' },
  'QUAL006': { severity: 'low', category: 'quality', title: 'Deeply nested code',
    why: 'Deep nesting makes the logic hard to follow.',
    fix: 'Use early returns (guard clauses) and extract inner blocks into functions.',
    ifIgnored: 'Readers misunderstand the flow, and bugs hide in the inner levels.' },
  'QUAL007': { severity: 'low', category: 'quality', title: 'Too many parameters',
    why: 'Functions with many parameters are easy to call wrongly.',
    fix: 'Group related parameters into one object (or dataclass) and pass that.',
    ifIgnored: 'Callers pass arguments in the wrong order and the signature is painful to change.' },
  'QUAL008': { severity: 'medium', category: 'quality', title: 'File is very large',
    why: 'A very large file usually holds several responsibilities.',
    fix: 'Split the file by responsibility into smaller modules.',
    ifIgnored: 'Merge conflicts and accidental coupling become common.' },
  'QUAL009': { severity: 'medium', category: 'quality', title: 'Duplicated code block',
    why: 'The same code appears in more than one place, so a fix must be repeated everywhere.',
    fix: 'Move the shared code into one function or module and call it from both places.',
    ifIgnored: 'Copies drift apart and one of them keeps the old bug.' },
  'QUAL010': { severity: 'low', category: 'quality', title: 'Very long line',
    why: 'Very long lines are hard to read and review.',
    fix: 'Break the line, or let a formatter such as Prettier, Black or gofmt do it.',
    ifIgnored: 'Reviews miss problems that sit off-screen.' },
  'DEP001': { severity: 'low', category: 'dependencies', title: 'Dependency version not pinned',
    why: 'A wildcard or “latest” version can install a different, possibly breaking or compromised, release tomorrow.',
    fix: 'Pin an exact version or a tight range (for example "1.4.2" or "^1.4.2") and commit a lock file.',
    ifIgnored: 'Builds are not reproducible and a bad release can break or compromise the project.' },
  'DEP002': { severity: 'medium', category: 'dependencies', title: 'No lock file',
    why: 'Without a lock file, every install can resolve to different versions.',
    fix: 'Generate and commit the lock file (package-lock.json, yarn.lock, poetry.lock, go.sum, Cargo.lock).',
    ifIgnored: 'Different machines get different dependency versions, which causes “works on my machine” bugs.' },
  'DEP003': { severity: 'high', category: 'dependencies', title: 'Known vulnerability in a dependency',
    why: 'The OSV database lists a published security advisory for this version.',
    fix: 'Upgrade to the fixed version shown, run your tests, and commit the updated manifest and lock file.',
    ifIgnored: 'Attackers can use the published exploit against your application.' },
  'DOC001': { severity: 'medium', category: 'documentation', title: 'No README',
    why: 'Without a README nobody knows what the project is or how to run it.',
    fix: 'Add README.md with what the project does, how to install it, how to run it and the licence.',
    ifIgnored: 'Few people will try or contribute to the project.' },
  'DOC002': { severity: 'low', category: 'documentation', title: 'README is missing key sections',
    why: 'A README should at least explain installation and usage.',
    fix: 'Add “Installation” and “Usage” sections with commands that work from a clean checkout.',
    ifIgnored: 'New users cannot get started without asking you.' },
  'DOC003': { severity: 'medium', category: 'documentation', title: 'No licence file',
    why: 'Without a licence, other people have no legal permission to use or change your code.',
    fix: 'Add a LICENSE file. choosealicense.com helps you pick one (MIT and Apache-2.0 are common).',
    ifIgnored: 'Companies and careful developers will not use the project.' },
  'DOC004': { severity: 'info', category: 'documentation', title: 'No contributing guide',
    why: 'Contributors need to know how to propose changes.',
    fix: 'Add CONTRIBUTING.md with setup steps, coding style and how to open a pull request.',
    ifIgnored: 'Contributions arrive in inconsistent shapes or not at all.' },
  'TEST001': { severity: 'high', category: 'testing', title: 'No automated tests found',
    why: 'Without tests, any change can silently break existing behaviour.',
    fix: 'Add a test framework (Jest/Vitest, pytest, JUnit, go test) and write tests for the most important functions first.',
    ifIgnored: 'Bugs are found by users instead of by the test run.' },
  'TEST002': { severity: 'medium', category: 'testing', title: 'No continuous integration',
    why: 'CI runs your tests automatically on every push.',
    fix: 'Add a workflow file such as .github/workflows/ci.yml that installs dependencies and runs the tests.',
    ifIgnored: 'Broken code can be merged without anyone noticing.' },
  'TEST003': { severity: 'low', category: 'testing', title: 'Very few tests for the amount of code',
    why: 'A small number of test files for many source files leaves most code unprotected.',
    fix: 'Add tests for the largest and most complex files first (see Hotspots).',
    ifIgnored: 'Large parts of the code can break without any test failing.' },
  'MAINT001': { severity: 'medium', category: 'maintenance', title: 'Repository looks inactive',
    why: 'No push for a long time suggests the project is not maintained.',
    fix: 'If it is still alive, publish a release or a short status note. If not, archive it so users know.',
    ifIgnored: 'Users depend on code that will not receive fixes.' },
  'MAINT002': { severity: 'medium', category: 'maintenance', title: 'Single person wrote most of the code',
    why: 'If that person leaves, nobody else knows the code (a bus factor of 1).',
    fix: 'Invite reviewers, document the architecture and share ownership of modules.',
    ifIgnored: 'The project can stall completely when one person becomes unavailable.' },
  'MAINT003': { severity: 'low', category: 'maintenance', title: 'Pull requests merge slowly',
    why: 'A long median time to merge discourages contributors.',
    fix: 'Set a review target (for example two working days) and label small pull requests for quick review.',
    ifIgnored: 'Contributors lose interest and leave.' },
  'OPS001': { severity: 'low', category: 'quality', title: 'Container runs as root',
    why: 'A Dockerfile without USER runs the application as root inside the container.',
    fix: 'Add a non-root user (RUN adduser ... and USER appuser) before the final CMD.',
    ifIgnored: 'A compromised app has more power over the container.' },
  'OPS002': { severity: 'low', category: 'quality', title: 'Container image uses the “latest” tag',
    why: 'The “latest” tag changes over time, so builds are not repeatable.',
    fix: 'Pin an exact version tag, for example FROM node:22.11-alpine.',
    ifIgnored: 'A new base image can break or compromise the build without any change in your code.' },
};

const SECRET_PATTERNS = [
  { re: /AKIA[0-9A-Z]{16}/, label: 'AWS access key', severity: 'critical' },
  { re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/, label: 'private key', severity: 'critical' },
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/, label: 'GitHub token', severity: 'critical' },
  { re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: 'Slack token', severity: 'high' },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/, label: 'Google API key', severity: 'high' },
  { re: /\bsk_live_[0-9a-zA-Z]{16,}\b/, label: 'Stripe live key', severity: 'critical' },
  { re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/, label: 'Anthropic API key', severity: 'critical' },
  { re: /\bsk-[A-Za-z0-9]{32,}\b/, label: 'API secret key', severity: 'high' },
];
const GENERIC_SECRET = /(?:api[_-]?key|secret|token|passwd|password|auth[_-]?key|access[_-]?key)\s*[:=]\s*['"]([^'"\s]{12,})['"]/i;
const PLACEHOLDER = /(example|your|xxx|changeme|change_me|placeholder|dummy|sample|test|fake|redacted|<|\$\{|process\.env|os\.environ|\*\*\*)/i;

function mask(line) {
  return line
    .replace(/(['"])([^'"\s]{6})[^'"\s]{6,}\1/g, '$1$2…$1')
    .replace(/(AKIA[0-9A-Z]{4})[0-9A-Z]{12}/g, '$1…')
    .replace(/(gh[pousr]_)[A-Za-z0-9]{6}[A-Za-z0-9]+/g, '$1…')
    .replace(/(sk[-_](?:live_|ant-)?)[A-Za-z0-9_-]{6}[A-Za-z0-9_-]+/g, '$1…');
}

function shannon(s) {
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  return -Object.values(counts).reduce((sum, c) => sum + (c / s.length) * Math.log2(c / s.length), 0);
}

export function snippetAround(lines, idx, { maskSecrets = false } = {}) {
  const from = Math.max(0, idx - 1), to = Math.min(lines.length - 1, idx + 1);
  const out = [];
  for (let i = from; i <= to; i++) out.push({ n: lines[i].n, text: (maskSecrets ? mask(lines[i].raw) : lines[i].raw).slice(0, 220), hit: i === idx });
  return out;
}

function make(rule, o) {
  const base = RULES[rule];
  return { rule, severity: o.severity ?? base.severity, category: base.category, title: o.title ?? base.title, file: o.file, line: o.line ?? null, endLine: o.endLine ?? null,
    message: o.message, snippet: o.snippet ?? null, why: base.why, fix: o.fix ?? base.fix, ifIgnored: base.ifIgnored, confidence: o.confidence ?? 'high' };
}

/** Per-line rules for one source file. Returns findings with file:line. */
export function lineFindings({ path, lines, lang, isTest }) {
  const out = [];
  const langName = lang?.name;
  const isJs = langName === 'JavaScript' || langName === 'TypeScript';
  const isPy = langName === 'Python';
  const perRuleCap = { QUAL002: 25, QUAL003: 10, QUAL010: 3 };
  const counts = {};
  const add = (rule, o) => {
    counts[rule] = (counts[rule] || 0) + 1;
    if (perRuleCap[rule] && counts[rule] > perRuleCap[rule]) return;
    out.push(make(rule, { file: path, ...o }));
  };

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const code = l.code;

    // --- secrets: checked on the raw line, skipped in tests and examples
    if (!isTest && !/\.(md|txt)$/i.test(path) && !/\.example$|\.sample$/i.test(path)) {
      let hit = null;
      for (const p of SECRET_PATTERNS) if (p.re.test(l.raw)) { hit = { severity: p.severity, label: p.label }; break; }
      if (!hit) {
        const g = l.raw.match(GENERIC_SECRET);
        if (g && !PLACEHOLDER.test(g[1]) && shannon(g[1]) >= 3.0) hit = { severity: 'high', label: 'hard-coded credential' };
      }
      if (hit) add('SEC001', { severity: hit.severity, line: l.n, message: `Looks like ${/^[aeiou]/i.test(hit.label) ? 'an' : 'a'} ${hit.label}. The value is hidden here.`, snippet: snippetAround(lines, i, { maskSecrets: true }), confidence: hit.label === 'hard-coded credential' ? 'medium' : 'high' });
    }

    if (!code.trim() && !l.comment) continue;

    // --- TODO markers live in comments
    const todo = l.comment.match(/\b(TODO|FIXME|HACK|XXX)\b[:\s-]*(.{0,80})/);
    if (todo) add('QUAL002', { line: l.n, message: `${todo[1]}: ${todo[2].trim() || '(no description)'}`, snippet: snippetAround(lines, i) });

    if (l.raw.length > 200 && !/https?:\/\//.test(l.raw)) add('QUAL010', { line: l.n, message: `Line is ${l.raw.length} characters long.`, snippet: null });

    if (isJs) {
      if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(code)) add('SEC002', { line: l.n, message: 'eval() or new Function() runs text as code.', snippet: snippetAround(lines, i) });
      if (/\.innerHTML\s*=|\.outerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(/.test(code)) add('SEC003', { line: l.n, message: 'Raw HTML is written into the page.', snippet: snippetAround(lines, i), confidence: 'medium' });
      if (/rejectUnauthorized\s*:\s*false/.test(l.raw) || /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/.test(l.raw)) add('SEC005', { line: l.n, message: 'TLS certificate verification is turned off.', snippet: snippetAround(lines, i) });
      if (/child_process|\bexec(?:Sync)?\s*\(/.test(code) && /\bexec(?:Sync)?\s*\(\s*(?:`|[A-Za-z_$][\w$.]*\s*\+|\w+\s*\))/.test(l.raw)) add('SEC006', { line: l.n, message: 'exec() runs a command string through the shell.', snippet: snippetAround(lines, i), confidence: 'medium' });
      if (!isTest && /\bconsole\.(log|debug)\s*\(/.test(code)) add('QUAL003', { line: l.n, message: 'console.log left in source code.', snippet: snippetAround(lines, i) });
      if (/^\s*debugger\s*;?\s*$/.test(code)) add('QUAL003', { severity: 'medium', line: l.n, message: 'debugger statement left in source code.', snippet: snippetAround(lines, i) });
      if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(code)) add('QUAL001', { line: l.n, message: 'Empty catch block hides errors.', snippet: snippetAround(lines, i) });
      else if (/catch\s*(?:\([^)]*\))?\s*\{\s*$/.test(code) && lines[i + 1] && /^\s*\}/.test(lines[i + 1].code) && !lines[i + 1].comment) add('QUAL001', { line: l.n, message: 'Empty catch block hides errors.', snippet: snippetAround(lines, i) });
    }

    if (isPy) {
      if (/\b(?:eval|exec)\s*\(/.test(code) && !/ast\.literal_eval/.test(code)) add('SEC002', { line: l.n, message: 'eval() or exec() runs text as code.', snippet: snippetAround(lines, i) });
      if (/verify\s*=\s*False/.test(code)) add('SEC005', { line: l.n, message: 'TLS certificate verification is turned off (verify=False).', snippet: snippetAround(lines, i) });
      if (/shell\s*=\s*True/.test(code) || /\bos\.system\s*\(/.test(code)) add('SEC006', { line: l.n, message: 'A shell is used to run a command.', snippet: snippetAround(lines, i) });
      if (/\bpickle\.loads?\s*\(/.test(code) || (/\byaml\.load\s*\(/.test(code) && !/Loader\s*=\s*(?:yaml\.)?(?:Safe|CSafe)Loader/.test(code))) add('SEC007', { line: l.n, message: 'Unsafe deserialisation (pickle.load or yaml.load).', snippet: snippetAround(lines, i) });
      if (/^\s*except\s*:/.test(code)) add('QUAL001', { line: l.n, message: 'Bare except catches every error, including KeyboardInterrupt.', snippet: snippetAround(lines, i) });
      else if (/^\s*except\b[^:]*:\s*$/.test(code) && lines[i + 1] && /^\s*pass\s*$/.test(lines[i + 1].code)) add('QUAL001', { line: l.n, message: 'except block only says pass, so the error is ignored.', snippet: snippetAround(lines, i) });
      if (!isTest && /^\s*print\s*\(/.test(code)) add('QUAL003', { line: l.n, message: 'print() left in source code.', snippet: snippetAround(lines, i) });
      if (/\.execute\s*\(\s*(?:f["']|["'][^"']*["']\s*(?:%|\+|\.format))/.test(l.raw) || /\.execute\s*\(\s*f["']/.test(l.raw)) add('SEC004', { line: l.n, message: 'SQL query is built with string formatting.', snippet: snippetAround(lines, i), confidence: 'medium' });
    }

    if (isJs && /(?:query|execute)\s*\(\s*(?:`[^`]*\$\{|"[^"]*(?:SELECT|INSERT|UPDATE|DELETE)[^"]*"\s*\+|'[^']*(?:SELECT|INSERT|UPDATE|DELETE)[^']*'\s*\+)/i.test(l.raw)) add('SEC004', { line: l.n, message: 'SQL query is built from a template string or concatenation.', snippet: snippetAround(lines, i), confidence: 'medium' });
  }
  return out;
}

/** Findings that come from function metrics. */
export function functionFindings({ path, lines, functions }) {
  const out = [];
  for (const fn of functions) {
    const at = lines.findIndex((l) => l.n === fn.startLine);
    const snip = at >= 0 ? snippetAround(lines, at) : null;
    if (fn.length > 150) out.push(make('QUAL004', { file: path, line: fn.startLine, endLine: fn.endLine, severity: 'high', message: `${fn.name}() has ${fn.length} lines of code (limit 150).`, snippet: snip }));
    else if (fn.length > 80) out.push(make('QUAL004', { file: path, line: fn.startLine, endLine: fn.endLine, message: `${fn.name}() has ${fn.length} lines of code (limit 80).`, snippet: snip }));
    if (fn.complexity > 25) out.push(make('QUAL005', { file: path, line: fn.startLine, endLine: fn.endLine, severity: 'high', message: `${fn.name}() has cyclomatic complexity ${fn.complexity} (limit 25).`, snippet: snip }));
    else if (fn.complexity > 15) out.push(make('QUAL005', { file: path, line: fn.startLine, endLine: fn.endLine, message: `${fn.name}() has cyclomatic complexity ${fn.complexity} (limit 15).`, snippet: snip }));
    if (fn.nesting > 5) out.push(make('QUAL006', { file: path, line: fn.startLine, endLine: fn.endLine, message: `${fn.name}() nests code ${fn.nesting} levels deep (limit 5).`, snippet: snip }));
    if (fn.params > 6) out.push(make('QUAL007', { file: path, line: fn.startLine, endLine: fn.endLine, message: `${fn.name}() takes ${fn.params} parameters (limit 6).`, snippet: snip }));
  }
  return out;
}

export const largeFileFinding = (path, loc) => make('QUAL008', { file: path, line: 1, message: `${path} has ${loc} lines of code (limit 800).`, severity: loc > 1500 ? 'high' : 'medium' });
export const repoFinding = (rule, o) => make(rule, { file: o.file ?? '(repository)', ...o });
export const dockerFindings = ({ path, lines }) => {
  const out = [];
  let hasUser = false;
  lines.forEach((l, i) => {
    if (/^\s*USER\s+(?!root\b)\S+/i.test(l.raw)) hasUser = true;
    if (/^\s*FROM\s+\S+:latest\b/i.test(l.raw) || /^\s*FROM\s+[^:\s@]+(?:\s+AS\s+\w+)?\s*$/i.test(l.raw) && !/\bscratch\b/i.test(l.raw)) out.push(make('OPS002', { file: path, line: l.n, message: 'Base image has no pinned version tag.', snippet: snippetAround(lines, i) }));
  });
  if (!hasUser && lines.some((l) => /^\s*FROM\s/i.test(l.raw))) out.push(make('OPS001', { file: path, line: 1, message: 'No non-root USER instruction found.' }));
  return out;
};
