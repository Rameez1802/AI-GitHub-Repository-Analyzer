import { repoFinding } from './rules.js';
import { warning } from '../errors.js';

const MANIFESTS = /(^|\/)(package\.json|requirements[\w.-]*\.txt|pyproject\.toml|go\.mod|Cargo\.toml|pom\.xml)$/;
export const isManifest = (p) => MANIFESTS.test(p) && !/(^|\/)(node_modules|vendor|\.venv|venv)\//.test(p);

const LOCKS = {
  npm: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'],
  PyPI: ['poetry.lock', 'uv.lock', 'Pipfile.lock', 'requirements.lock'],
  Go: ['go.sum'],
  crates: ['Cargo.lock'],
  Maven: [],
};
const OSV_ECOSYSTEM = { npm: 'npm', PyPI: 'PyPI', Go: 'Go', crates: 'crates.io', Maven: 'Maven' };

const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
const lineOf = (text, needle) => {
  const idx = text.split('\n').findIndex((l) => l.includes(needle));
  return idx >= 0 ? idx + 1 : 1;
};

export function isUnpinned(spec) {
  const s = String(spec ?? '').trim().toLowerCase();
  if (s === '' || s === '*' || s === 'latest' || s === 'x' || s === 'next') return true;
  if (/^(git\+|https?:|github:|file:|link:)/.test(s)) return false;
  if (/^>=?\s*[\d.]+\s*$/.test(s)) return true; // only a lower bound
  return false;
}

export function resolveVersion(spec) {
  const m = String(spec ?? '').match(/(\d+(?:\.\d+){0,3}(?:[-+][\w.]+)?)/);
  if (!m) return { version: null, exact: false };
  const exact = /^(?:==|=)?\s*v?\d/.test(String(spec).trim()) && !/[\^~<>*|x]/.test(String(spec).replace(/^==/, ''));
  return { version: m[1], exact };
}

function parsePackageJson(path, text) {
  let json;
  try { json = JSON.parse(text); } catch { return { error: 'Invalid JSON', deps: [], meta: {} }; }
  const deps = [];
  for (const [section, dev] of [['dependencies', false], ['devDependencies', true], ['peerDependencies', false], ['optionalDependencies', false]]) {
    for (const [name, spec] of Object.entries(json[section] ?? {})) deps.push({ name, spec: String(spec), dev, line: lineOf(text, `"${name}"`), ecosystem: 'npm' });
  }
  return { deps, meta: { name: json.name, main: json.main, bin: json.bin, start: json.scripts?.start, test: json.scripts?.test, hasTestScript: Boolean(json.scripts?.test && !/no test specified/.test(json.scripts.test)) } };
}

function parseRequirements(path, text) {
  const deps = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/#.*/, '').trim();
    if (!line || line.startsWith('-') || /^(git\+|https?:)/.test(line)) return;
    const m = line.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*((?:==|>=|<=|~=|!=|>|<)\s*[\w.*+-]+(?:\s*,\s*(?:==|>=|<=|~=|!=|>|<)\s*[\w.*+-]+)*)?/);
    if (m) deps.push({ name: m[1], spec: (m[2] || '').replace(/\s+/g, ''), dev: /dev|test/i.test(path), line: i + 1, ecosystem: 'PyPI' });
  });
  return { deps, meta: {} };
}

function parsePyproject(path, text) {
  const deps = [];
  const arr = text.match(/\bdependencies\s*=\s*\[([\s\S]*?)\]/);
  if (arr) for (const m of arr[1].matchAll(/["']([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*([^"']*)["']/g)) deps.push({ name: m[1], spec: m[2].replace(/\s+/g, ''), dev: false, line: lineOf(text, m[0]), ecosystem: 'PyPI' });
  const poetry = text.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(?:\n\[|$)/);
  if (poetry) for (const m of poetry[1].matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(?:"([^"]*)"|\{[^}]*version\s*=\s*"([^"]*)")/gm)) if (m[1].toLowerCase() !== 'python') deps.push({ name: m[1], spec: m[2] ?? m[3] ?? '', dev: false, line: lineOf(text, m[0].trim()), ecosystem: 'PyPI' });
  return { deps, meta: {} };
}

function parseGoMod(path, text) {
  const deps = [];
  let inBlock = false;
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\/\/.*/, '').trim();
    if (/^require\s*\($/.test(line)) { inBlock = true; return; }
    if (inBlock && line === ')') { inBlock = false; return; }
    const m = (inBlock ? line : line.replace(/^require\s+/, '')).match(/^([\w./~-]+)\s+(v[\w.+-]+)/);
    if (m && (inBlock || /^require\s/.test(line))) deps.push({ name: m[1], spec: m[2], dev: false, line: i + 1, ecosystem: 'Go' });
  });
  return { deps, meta: { module: (text.match(/^module\s+(\S+)/m) || [])[1] } };
}

function parseCargo(path, text) {
  const deps = [];
  const sections = text.split(/^\[/m).slice(1);
  for (const sec of sections) {
    const head = sec.split('\n')[0];
    if (!/^(dev-|build-)?dependencies\]/.test(head)) continue;
    const dev = /^dev-/.test(head);
    sec.split('\n').slice(1).forEach((raw, i) => {
      const m = raw.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|\{[^}]*version\s*=\s*"([^"]*)")/);
      if (m) deps.push({ name: m[1], spec: m[2] ?? m[3] ?? '*', dev, line: lineOf(text, raw.trim()), ecosystem: 'crates' });
    });
  }
  return { deps, meta: {} };
}

function parsePom(path, text) {
  const deps = [];
  for (const m of text.matchAll(/<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>(?:\s*<version>([^<]*)<\/version>)?/g)) {
    deps.push({ name: `${m[1].trim()}:${m[2].trim()}`, spec: (m[3] || '').trim(), dev: false, line: lineOf(text, m[2]), ecosystem: 'Maven' });
  }
  return { deps, meta: {} };
}

const PARSERS = [[/package\.json$/, parsePackageJson], [/requirements[\w.-]*\.txt$/, parseRequirements], [/pyproject\.toml$/, parsePyproject], [/go\.mod$/, parseGoMod], [/Cargo\.toml$/, parseCargo], [/pom\.xml$/, parsePom]];

export function analyseDependencies(manifests, allPaths) {
  const pathSet = new Set(allPaths);
  const ecosystems = [];
  const findings = [];

  for (const { path, text } of manifests) {
    const parser = PARSERS.find(([re]) => re.test(path))?.[1];
    if (!parser) continue;
    const parsed = parser(path, text);
    if (!parsed.deps.length && !parsed.meta?.name && !parsed.error) continue;
    const eco = parsed.deps[0]?.ecosystem ?? (/package\.json$/.test(path) ? 'npm' : /go\.mod$/.test(path) ? 'Go' : /Cargo/.test(path) ? 'crates' : /pom/.test(path) ? 'Maven' : 'PyPI');
    const dir = dirOf(path);
    const lock = (LOCKS[eco] || []).map((n) => (dir ? `${dir}/${n}` : n)).find((p) => pathSet.has(p)) ?? null;
    const deps = parsed.deps.map((d) => ({ ...d, unpinned: isUnpinned(d.spec), ...resolveVersion(d.spec) }));
    ecosystems.push({ ecosystem: eco, manifest: path, lockfile: lock, meta: parsed.meta ?? {}, error: parsed.error ?? null, deps });

    for (const d of deps.filter((x) => x.unpinned && !x.dev).slice(0, 15)) {
      findings.push(repoFinding('DEP001', { file: path, line: d.line, message: `${d.name} is declared as "${d.spec || '(no version)'}".` }));
    }
    if (deps.some((d) => !d.dev) && !lock && eco !== 'Maven') {
      findings.push(repoFinding('DEP002', { file: path, line: 1, message: `${path} has ${deps.length} dependencies but no lock file was found next to it.` }));
    }
  }
  return { ecosystems, findings };
}

/** Checks pinned versions against OSV.dev. Returns { status, reason, items, checked }. */
export async function checkVulnerabilities(ecosystems, { fetchImpl = fetch, enabled = true, signal } = {}) {
  const candidates = [];
  for (const eco of ecosystems) for (const d of eco.deps) if (d.version && OSV_ECOSYSTEM[d.ecosystem] && !d.unpinned) candidates.push({ eco, d });
  if (!enabled) return { status: 'skipped', reason: 'disabled with OSV=0', items: [], checked: 0, warnings: [] };
  if (!candidates.length) return { status: 'skipped', reason: 'no dependencies with a usable version', items: [], checked: 0, warnings: [warning('OSV_SKIPPED')] };

  const subset = candidates.slice(0, 100);
  try {
    const res = await fetchImpl('https://api.osv.dev/v1/querybatch', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal,
      body: JSON.stringify({ queries: subset.map(({ d }) => ({ package: { name: d.name, ecosystem: OSV_ECOSYSTEM[d.ecosystem] }, version: d.version })) }),
    });
    if (!res.ok) throw new Error(`OSV answered ${res.status}`);
    const data = await res.json();
    const hits = [];
    (data.results ?? []).forEach((r, i) => { for (const v of r.vulns ?? []) hits.push({ cand: subset[i], id: v.id }); });

    const details = new Map();
    for (const id of [...new Set(hits.map((h) => h.id))].slice(0, 25)) {
      try {
        const r = await fetchImpl(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, { signal });
        if (r.ok) details.set(id, await r.json());
      } catch { /* a single missing detail must not fail the check */ }
    }
    const items = hits.map(({ cand, id }) => {
      const v = details.get(id) ?? {};
      const fixed = (v.affected ?? []).flatMap((a) => (a.ranges ?? []).flatMap((rg) => (rg.events ?? []).filter((e) => e.fixed).map((e) => e.fixed)))[0] ?? null;
      const sev = String(v.database_specific?.severity ?? 'unknown').toLowerCase().replace('moderate', 'medium');
      return { package: cand.d.name, version: cand.d.version, approximate: !cand.d.exact, manifest: cand.eco.manifest, line: cand.d.line, id, summary: v.summary ?? v.details?.slice(0, 160) ?? 'See the advisory for details.', severity: sev, fixedIn: fixed, url: `https://osv.dev/vulnerability/${id}` };
    });
    return { status: 'checked', reason: null, items, checked: subset.length, warnings: [] };
  } catch (error) {
    return { status: 'failed', reason: error.message, items: [], checked: 0, warnings: [warning('OSV_FAILED', { reason: error.message })] };
  }
}

export function vulnerabilityFindings(items) {
  return items.map((v) => repoFinding('DEP003', {
    file: v.manifest, line: v.line, severity: ['critical', 'high'].includes(v.severity) ? v.severity : v.severity === 'low' ? 'low' : 'medium',
    message: `${v.package}@${v.version} has advisory ${v.id}: ${v.summary}${v.fixedIn ? ` Fixed in ${v.fixedIn}.` : ''}${v.approximate ? ' (Version taken from a range, so verify it.)' : ''}`,
    fix: v.fixedIn ? `Upgrade ${v.package} to ${v.fixedIn} or later, run your tests, and commit the updated manifest and lock file.` : undefined,
    confidence: v.approximate ? 'medium' : 'high',
  }));
}
