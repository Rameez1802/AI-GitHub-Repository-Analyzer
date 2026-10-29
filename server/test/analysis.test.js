import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../src/analysis/lexer.js';
import { extractFunctions } from '../src/analysis/functions.js';
import { languageOf } from '../src/analysis/languages.js';
import { analyseRepository } from '../src/analysis/engine.js';
import { LocalSource } from '../src/sources/local.js';
import { isUnpinned, resolveVersion } from '../src/analysis/dependencies.js';
import { buildIndex, search, tokenize } from '../src/retrieval/bm25.js';
import { chunkFiles } from '../src/retrieval/chunker.js';
import { FIXTURE, lineOf } from './helpers.js';

const js = (name) => ({ name, ...languageOf(`x.${name === 'Python' ? 'py' : 'js'}`) });

test('lexer ignores comments and string contents but keeps line numbers', () => {
  const lines = scan('const u = "http://a.b//c"; // note TODO\n/* a\n b */\nlet x = 1;\n', js('JavaScript'));
  assert.equal(lines.length, 5);
  assert.equal(lines[0].code, 'const u = "";');
  assert.match(lines[0].comment, /TODO/);
  assert.equal(lines[1].code, '');
  assert.equal(lines[3].code, 'let x = 1;');
});

test('python docstrings count as comments, not code', () => {
  const lines = scan('def f():\n    """doc\n    more"""\n    return 1\n', js('Python'));
  assert.equal(lines[1].code, '');
  assert.match(lines[1].comment, /doc/);
});

test('function extractor measures length, complexity, params and nesting', () => {
  const src = 'function add(a, b) {\n  if (a > 0 && b > 0) { return a + b; }\n  for (const i of []) { if (i) { run(); } }\n  return a ?? b;\n}\n';
  const lines = scan(src, js('JavaScript'));
  const [fn] = extractFunctions(lines, js('JavaScript'));
  assert.equal(fn.name, 'add');
  assert.equal(fn.startLine, 1);
  assert.equal(fn.endLine, 5);
  assert.equal(fn.params, 2);
  assert.equal(fn.complexity, 6); // 1 + if + && + for + if + ??
  assert.ok(fn.nesting >= 2);
});

test('arrow function with expression body is not counted as a function', () => {
  const lines = scan('const f = (x) => x + 1;\nconst g = (x) => {\n  return x;\n};\n', js('JavaScript'));
  const fns = extractFunctions(lines, js('JavaScript'));
  assert.deepEqual(fns.map((f) => f.name), ['g']);
});

test('dependency helpers', () => {
  assert.equal(isUnpinned('*'), true);
  assert.equal(isUnpinned('latest'), true);
  assert.equal(isUnpinned('>=2.0'), true);
  assert.equal(isUnpinned('^1.2.3'), false);
  assert.deepEqual(resolveVersion('4.17.15'), { version: '4.17.15', exact: true });
  assert.equal(resolveVersion('^1.2.3').exact, false);
});

const analyse = () => analyseRepository(new LocalSource(FIXTURE, { name: 'sample-shop' }), { osvEnabled: false });

test('engine reports findings with the exact file and line', async () => {
  const { result } = await analyse();
  const find = (rule, file) => result.findings.find((f) => f.rule === rule && f.file === file);
  assert.equal(find('SEC001', 'app/server.py').line, 6, 'AWS key');
  assert.equal(find('SEC001', 'app/server.py').severity, 'critical');
  assert.equal(result.findings.find((f) => f.rule === 'SEC001' && f.file === 'src/index.js').line, 4, 'hard-coded key');
  assert.equal(find('QUAL001', 'app/server.py').line, 17, 'bare except');
  assert.equal(find('QUAL001', 'src/api/client.js').line, 7, 'empty catch');
  assert.equal(find('SEC002', 'src/api/client.js').line, 20, 'eval');
  assert.equal(find('SEC003', 'src/api/client.js').line, 12, 'innerHTML');
  assert.equal(find('SEC004', 'src/api/client.js').line, 16, 'SQL concatenation');
  assert.equal(find('SEC005', 'app/server.py').line, 16, 'verify=False');
  assert.equal(find('SEC006', 'app/server.py').line, 23, 'shell=True');
  assert.equal(find('SEC007', 'app/server.py').line, 11, 'yaml.load');
  assert.equal(find('QUAL005', 'src/utils/format.js').line, 5, 'complex function');
  assert.equal(find('SEC008', '.env').line, 1, '.env committed');
  assert.equal(find('DEP001', 'package.json').line, 9, 'express "*"');
});

test('every finding explains why, how to fix and what happens if ignored', async () => {
  const { result } = await analyse();
  for (const f of result.findings) {
    assert.ok(f.why && f.fix && f.ifIgnored && f.message && f.title, `${f.rule} is missing text`);
    assert.ok(['critical', 'high', 'medium', 'low', 'info'].includes(f.severity));
  }
});

test('secrets are masked in snippets', async () => {
  const { result } = await analyse();
  const f = result.findings.find((x) => x.rule === 'SEC001' && x.file === 'src/index.js');
  const text = f.snippet.map((s) => s.text).join('\n');
  assert.ok(!text.includes('a8f3b2c9d1e4f5a6b7c8d9e0f1a2b3c4'), 'full secret must not appear');
  const aws = result.findings.find((x) => x.rule === 'SEC001' && x.file === 'app/server.py');
  assert.ok(!aws.snippet.map((s) => s.text).join('\n').includes('AKIAIOSFODNN7EXAMPLE'));
});

test('duplicate block is found in both files', async () => {
  const { result } = await analyse();
  const block = result.duplication.blocks[0];
  assert.deepEqual([block.a.file, block.b.file].sort(), ['src/api/client.js', 'src/utils/format.js']);
  assert.ok(block.lines >= 6);
  assert.ok(result.metrics.duplicationPercent > 0);
});

test('architecture maps modules, imports and entry points', async () => {
  const { result } = await analyse();
  const api = result.architecture.modules.find((m) => m.name === 'src/api');
  assert.ok(api.dependsOn.includes('src/utils'));
  assert.ok(result.architecture.entryPoints.some((e) => e.file === 'src/index.js'));
});

test('dependencies: manifests parsed, missing lock file reported', async () => {
  const { result } = await analyse();
  const pkg = result.dependencies.ecosystems.find((e) => e.manifest === 'package.json');
  assert.equal(pkg.deps.length, 3);
  assert.equal(pkg.lockfile, null);
  assert.ok(result.findings.some((f) => f.rule === 'DEP002' && f.file === 'package.json'));
  assert.equal(result.dependencies.vulnerabilities.status, 'skipped');
});

test('score is bounded, explained, and leaves unmeasurable factors out', async () => {
  const { result } = await analyse();
  assert.ok(result.score.overall >= 0 && result.score.overall <= 100);
  const m = result.score.factors.find((f) => f.letter === 'M');
  assert.equal(m.applicable, false, 'no git history in the sample');
  const used = result.score.factors.filter((f) => f.applicable);
  assert.ok(Math.abs(used.reduce((s, f) => s + f.effectiveWeight, 0) - 1) < 0.02, 'effective weights sum to 1');
  for (const f of used) assert.ok(f.evidence.length > 0, `${f.letter} lists its evidence`);
});

test('retrieval finds the right file and keeps line numbers', async () => {
  const { internal } = await analyse();
  const hits = search(internal.index, 'format value currency options', 3);
  assert.equal(hits[0].file, 'src/utils/format.js');
  assert.ok(hits[0].startLine >= 1 && hits[0].endLine >= hits[0].startLine);
  assert.deepEqual(search(internal.index, 'zzzzqqqq', 3), []);
  assert.deepEqual(tokenize('getUserName_value'), ['get', 'user', 'name', 'value']);
});

test('chunker keeps documentation separate from code', () => {
  const chunks = chunkFiles([], [{ path: 'README.md', text: '# One\nsome words about the project here\n\n## Two\nmore words about usage here too' }]);
  assert.ok(chunks.length >= 2 && chunks.every((c) => c.kind === 'doc'));
});

test('minified bundles are skipped instead of producing noise', async () => {
  const minified = 'var a=1;' + 'function f(x){return x?1:2}'.repeat(200) + '\n';
  const source = {
    kind: 'local', slug: 'm',
    getMeta: async () => ({ repo: { full_name: 'm', name: 'm', owner: { login: 'l' } }, branch: 'main', displayName: 'm' }),
    getTree: async () => ({ files: [{ path: 'app.js', size: 400 }, { path: 'dist.js', size: minified.length }], truncated: false }),
    getFile: async (p) => (p === 'app.js' ? 'export function ok() {\n  return 1;\n}\n' : minified),
    getExtras: async () => ({ commitActivity: [], contributors: [], pulls: [], unavailableReason: 'none' }),
  };
  const { result } = await analyseRepository(source, { osvEnabled: false });
  assert.equal(result.coverage.filesAnalysed, 1);
  assert.equal(result.coverage.skippedMinified, 1);
  assert.ok(result.warnings.some((w) => w.code === 'FILES_SKIPPED' && /minified/.test(w.message)));
});
