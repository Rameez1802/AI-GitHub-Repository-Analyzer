import { languageOf, extOf } from './languages.js';

const JS_EXTS = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];
const dirname = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');

function normalise(parts) {
  const out = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop(); else out.push(part);
  }
  return out.join('/');
}

function resolveJs(spec, from, fileSet) {
  const candidates = [];
  if (spec.startsWith('.')) candidates.push(normalise([...dirname(from).split('/'), ...spec.split('/')]));
  else if (spec.startsWith('@/') || spec.startsWith('~/')) { candidates.push(`src/${spec.slice(2)}`, spec.slice(2)); }
  else if (spec.startsWith('src/')) candidates.push(spec);
  else return null;
  for (const base of candidates) {
    for (const ext of JS_EXTS) if (fileSet.has(base + ext)) return base + ext;
    for (const ext of JS_EXTS.slice(1)) if (fileSet.has(`${base}/index${ext}`)) return `${base}/index${ext}`;
  }
  return null;
}

function resolvePython(spec, from, fileSet) {
  let base;
  if (spec.startsWith('.')) {
    const dots = spec.match(/^\.+/)[0].length;
    const rest = spec.slice(dots).split('.').filter(Boolean);
    const dirParts = dirname(from).split('/').filter(Boolean);
    base = normalise([...dirParts.slice(0, dirParts.length - (dots - 1)), ...rest]);
  } else {
    const rel = spec.split('.').join('/');
    for (const root of ['', 'src/', 'lib/', 'app/']) {
      for (const cand of [`${root}${rel}.py`, `${root}${rel}/__init__.py`]) if (fileSet.has(cand)) return cand;
    }
    return null;
  }
  for (const cand of [`${base}.py`, `${base}/__init__.py`]) if (fileSet.has(cand)) return cand;
  return null;
}

function importsOf(file) {
  const out = [];
  const name = file.lang?.name;
  for (const l of file.lines) {
    if (!l.code.trim()) continue;
    const raw = l.raw;
    if (name === 'JavaScript' || name === 'TypeScript') {
      for (const m of raw.matchAll(/(?:\bimport\s+(?:[^'"]*?\s+from\s+)?|\bexport\s+[^'"]*?\s+from\s+|\brequire\s*\(\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g)) out.push(m[1]);
    } else if (name === 'Python') {
      let m = raw.match(/^\s*from\s+([.\w]+)\s+import\b/);
      if (m) out.push(m[1]);
      else if ((m = raw.match(/^\s*import\s+([\w.,\s]+?)(?:\s+as\s+\w+)?\s*$/))) m[1].split(',').forEach((x) => out.push(x.trim().split(/\s+as\s+/)[0]));
    } else if (name === 'Java' || name === 'Kotlin') {
      const m = raw.match(/^\s*import\s+(?:static\s+)?([\w.]+)/);
      if (m) out.push(m[1]);
    } else if (name === 'C' || name === 'C++') {
      const m = raw.match(/^\s*#\s*include\s+"([^"]+)"/);
      if (m) out.push(m[1]);
    } else if (name === 'Go') {
      const m = raw.match(/^\s*(?:import\s+)?(?:\w+\s+)?"([\w./~-]+)"\s*$/);
      if (m && /[./]/.test(m[1])) out.push(m[1]);
    }
  }
  return out;
}

export function moduleOf(path) {
  const parts = path.split('/');
  if (parts.length === 1) return '(root)';
  if (['src', 'lib', 'app', 'packages', 'internal', 'pkg', 'cmd'].includes(parts[0]) && parts.length > 2) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function stronglyConnected(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n, []]));
  for (const { from, to } of edges) adj.get(from)?.push(to);
  let index = 0;
  const stack = [], on = new Set(), idx = new Map(), low = new Map(), sccs = [];
  const visit = (v) => {
    idx.set(v, index); low.set(v, index); index++; stack.push(v); on.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!idx.has(w)) { visit(w); low.set(v, Math.min(low.get(v), low.get(w))); } else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w)));
    }
    if (low.get(v) === idx.get(v)) {
      const comp = []; let w;
      do { w = stack.pop(); on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) sccs.push(comp.sort());
    }
  };
  for (const n of nodes) if (!idx.has(n)) visit(n);
  return sccs;
}

export function buildArchitecture(files, { allPaths, manifests = [] }) {
  const fileSet = new Set(allPaths);
  const goModule = manifests.flatMap((m) => m.meta?.module ? [m.meta.module] : [])[0];
  const edgeCounts = new Map();
  const external = new Map();
  const fileEdges = new Map();
  let resolved = 0, unresolved = 0;

  for (const f of files) {
    for (const spec of importsOf(f)) {
      let target = null;
      const name = f.lang?.name;
      if (name === 'JavaScript' || name === 'TypeScript') target = resolveJs(spec, f.path, fileSet);
      else if (name === 'Python') target = resolvePython(spec, f.path, fileSet);
      else if (name === 'C' || name === 'C++') target = fileSet.has(normalise([...dirname(f.path).split('/'), ...spec.split('/')])) ? normalise([...dirname(f.path).split('/'), ...spec.split('/')]) : null;
      else if (name === 'Java' || name === 'Kotlin') { const tail = spec.split('.').join('/'); target = allPaths.find((p) => p.endsWith(`${tail}.java`) || p.endsWith(`${tail}.kt`)) ?? null; }
      else if (name === 'Go' && goModule && spec.startsWith(goModule)) { const dir = spec.slice(goModule.length + 1); target = allPaths.find((p) => p.endsWith('.go') && dirname(p) === dir) ?? null; }

      if (target && target !== f.path) {
        resolved++;
        const a = moduleOf(f.path), b = moduleOf(target);
        if (!fileEdges.has(f.path)) fileEdges.set(f.path, new Set());
        fileEdges.get(f.path).add(target);
        if (a !== b) edgeCounts.set(`${a}\u0000${b}`, (edgeCounts.get(`${a}\u0000${b}`) ?? 0) + 1);
      } else if (!target) {
        const isRelative = spec.startsWith('.') || spec.startsWith('@/') || spec.startsWith('~/');
        if (isRelative) { unresolved++; continue; }
        const pkg = (name === 'Python' ? spec.split('.')[0] : spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
        if (name === 'JavaScript' || name === 'TypeScript') { if (pkg.startsWith('node:')) continue; }
        external.set(pkg, (external.get(pkg) ?? 0) + 1);
      }
    }
  }

  const modules = new Map();
  for (const f of files) {
    const key = moduleOf(f.path);
    if (!modules.has(key)) modules.set(key, { name: key, files: 0, loc: 0, languages: new Map(), dependsOn: new Set(), usedBy: new Set() });
    const m = modules.get(key);
    m.files++; m.loc += f.loc;
    if (f.lang) m.languages.set(f.lang.name, (m.languages.get(f.lang.name) ?? 0) + f.loc);
  }
  const edges = [];
  for (const [k, count] of edgeCounts) {
    const [from, to] = k.split('\u0000');
    edges.push({ from, to, count });
    modules.get(from)?.dependsOn.add(to);
    modules.get(to)?.usedBy.add(from);
  }
  const cycles = stronglyConnected([...modules.keys()], edges).slice(0, 5);

  // entry points
  const entries = [];
  for (const m of manifests) {
    if (m.meta?.main && fileSet.has(m.meta.main.replace(/^\.\//, ''))) entries.push({ file: m.meta.main.replace(/^\.\//, ''), reason: 'package.json "main"' });
    if (m.meta?.start) entries.push({ file: m.path, reason: `npm start runs: ${m.meta.start}` });
  }
  for (const f of files) {
    const base = f.path.split('/').pop();
    const raw = f.lines.map((l) => l.raw).join('\n');
    if (/^(main|index|app|server|cli|manage|wsgi|asgi)\.(js|ts|jsx|tsx|py|go|rs|java|kt|cs)$/i.test(base) && f.path.split('/').length <= 3) entries.push({ file: f.path, reason: 'conventional entry file name' });
    else if (f.lang?.name === 'Python' && /if\s+__name__\s*==\s*["']__main__["']/.test(raw)) entries.push({ file: f.path, reason: 'Python __main__ guard' });
    else if (/public\s+static\s+void\s+main\s*\(/.test(raw)) entries.push({ file: f.path, reason: 'Java main method' });
    else if (f.lang?.name === 'Go' && /^package\s+main\b/m.test(raw)) entries.push({ file: f.path, reason: 'Go package main' });
  }
  const seen = new Set();
  const entryPoints = entries.filter((e) => (seen.has(e.file) ? false : seen.add(e.file))).slice(0, 8);

  return {
    modules: [...modules.values()].map((m) => ({ name: m.name, files: m.files, loc: m.loc, languages: [...m.languages].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n), dependsOn: [...m.dependsOn].sort(), usedBy: [...m.usedBy].sort() })).sort((a, b) => b.loc - a.loc),
    edges, cycles, entryPoints,
    externalLibraries: [...external].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, files]) => ({ name, files })),
    importStats: { resolved, unresolved },
  };
}
