import { config } from '../config.js';
import { AppError, warning } from '../errors.js';
import { scan, isCodeLine } from './lexer.js';
import { languageOf, isSkippedPath, BINARY_EXT, extOf, isTestFile } from './languages.js';
import { extractFunctions } from './functions.js';
import { lineFindings, functionFindings, largeFileFinding, repoFinding, dockerFindings, SEVERITY_ORDER } from './rules.js';
import { findDuplicates } from './duplication.js';
import { analyseDependencies, checkVulnerabilities, vulnerabilityFindings, isManifest } from './dependencies.js';
import { buildArchitecture } from './architecture.js';
import { analyseDocs, analyseTesting } from './project.js';
import { summariseActivity } from './activity.js';
import { scoreRepository } from './score.js';
import { buildExtractiveSummary } from './summary.js';
import { chunkFiles } from '../retrieval/chunker.js';
import { buildIndex } from '../retrieval/bm25.js';
import { mapLimit } from '../sources/github.js';

const README = /^readme(\.\w+)?$/i;
const LICENSE = /^(license|licence|copying|unlicense)(\.\w+)?$/i;
const DOCKERFILE = /(^|\/)Dockerfile(\.\w+)?$/;
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;

export async function analyseRepository(source, options = {}) {
  const { limits = config.limits, osvEnabled = config.osvEnabled, fetchImpl = fetch, onProgress = () => {} } = options;
  const step = (stage, label, percent) => onProgress({ stage, label, percent });
  const warnings = [];

  step('meta', 'Reading repository details', 5);
  const { repo, branch, displayName } = await source.getMeta();

  step('tree', 'Listing files', 12);
  const tree = await source.getTree();
  if (!tree.files.length) throw new AppError('REPO_EMPTY');
  if (tree.truncated) warnings.push(warning('TREE_TRUNCATED'));
  const allPaths = tree.files.map((f) => f.path);

  // ---- choose which files to download ----------------------------------
  let tooLarge = 0;
  const candidates = [];
  for (const f of tree.files) {
    if (f.size === 0 || isSkippedPath(f.path) || BINARY_EXT.has(extOf(f.path))) continue;
    const lang = languageOf(f.path);
    if (!lang) continue;
    if (f.size > limits.maxFileBytes) { tooLarge++; continue; }
    candidates.push({ ...f, lang });
  }
  if (!candidates.length) throw new AppError('NO_SOURCE_FILES', { repo: displayName });
  candidates.sort((a, b) => Number(a.lang.style === 'none') - Number(b.lang.style === 'none') || a.path.split('/').length - b.path.split('/').length || b.size - a.size);
  const selected = candidates.slice(0, limits.maxFiles);
  const overCap = candidates.length - selected.length;
  if (overCap > 0) warnings.push(warning('FILES_SKIPPED', { count: overCap, reason: `limit of ${limits.maxFiles} files` }));
  if (tooLarge > 0) warnings.push(warning('FILES_SKIPPED', { count: tooLarge, reason: `larger than ${Math.round(limits.maxFileBytes / 1000)} KB` }));

  const rootReadme = allPaths.find((p) => README.test(p));
  const licensePath = allPaths.find((p) => LICENSE.test(p));
  const manifestPaths = allPaths.filter(isManifest).slice(0, 8);
  const dockerPaths = allPaths.filter((p) => DOCKERFILE.test(p) && !isSkippedPath(p)).slice(0, 3);
  const extra = [...new Set([rootReadme, licensePath, ...manifestPaths, ...dockerPaths].filter(Boolean))];

  // ---- download ---------------------------------------------------------
  step('files', `Downloading ${selected.length} source files`, 20);
  let done = 0, failed = 0;
  const texts = new Map();
  await mapLimit([...selected.map((f) => f.path), ...extra], limits.concurrency, async (p) => {
    const text = await source.getFile(p);
    if (typeof text === 'string') texts.set(p, text); else if (text === undefined) failed++;
    done++;
    if (done % 10 === 0) step('files', `Downloaded ${done} of ${selected.length + extra.length} files`, 20 + Math.round((done / (selected.length + extra.length)) * 35));
  });
  if (failed > 0) warnings.push(warning('FILE_FETCH_FAILED', { count: failed }));

  // ---- per-file analysis -----------------------------------------------
  step('analysis', 'Analysing code', 58);
  const files = [];
  const findings = [];
  let minified = 0;
  for (const f of selected) {
    const text = texts.get(f.path);
    if (typeof text !== 'string' || text.includes('\u0000')) continue;
    // minified or generated bundles are not human-written code
    const rawLines = text.split('\n');
    const longest = rawLines.reduce((m, l) => Math.max(m, l.length), 0);
    if (longest > 1500 || (rawLines.length < 80 && text.length / rawLines.length > 250)) { minified++; continue; }
    const lang = { name: f.lang.name, ...f.lang };
    const lines = scan(text, lang);
    const test = isTestFile(f.path);
    const loc = lines.filter(isCodeLine).length;
    const commentLines = lines.filter((l) => !l.code.trim() && l.comment).length;
    const functions = extractFunctions(lines, lang);
    files.push({ path: f.path, lang, loc, commentLines, lines, functions, bytes: f.size, isTest: test });
    findings.push(...lineFindings({ path: f.path, lines, lang, isTest: test }));
    if (!test) {
      findings.push(...functionFindings({ path: f.path, lines, functions }));
      if (loc > 800) findings.push(largeFileFinding(f.path, loc));
    }
  }
  if (minified > 0) warnings.push(warning('FILES_SKIPPED', { count: minified, reason: 'minified or generated bundles' }));
  for (const p of dockerPaths) if (texts.has(p)) findings.push(...dockerFindings({ path: p, lines: scan(texts.get(p), { line: ['#'] }) }));

  const qualityFiles = files.filter((f) => !f.isTest && f.lang.style !== 'none');
  const allFns = qualityFiles.flatMap((f) => f.functions.map((fn) => ({ ...fn, file: f.path })));
  const dup = findDuplicates(qualityFiles);
  for (const b of dup.blocks.slice(0, 8)) {
    findings.push(repoFinding('QUAL009', { file: b.a.file, line: b.a.line, endLine: b.a.endLine, message: `${b.lines} lines here are repeated at ${b.b.file}:${b.b.line}-${b.b.endLine}.` }));
  }

  const loc = files.reduce((s, f) => s + f.loc, 0);
  const qLoc = qualityFiles.reduce((s, f) => s + f.loc, 0);
  const qComments = qualityFiles.reduce((s, f) => s + f.commentLines, 0);
  const todoCount = findings.filter((f) => f.rule === 'QUAL002').length;
  const metrics = {
    loc, files: files.length, functions: allFns.length,
    avgComplexity: allFns.length ? r2(allFns.reduce((s, f) => s + f.complexity, 0) / allFns.length) : 0,
    maxComplexity: allFns.reduce((m, f) => Math.max(m, f.complexity), 0),
    pctComplex: allFns.length ? r1((allFns.filter((f) => f.complexity > 15).length / allFns.length) * 100) : 0,
    pctLong: allFns.length ? r1((allFns.filter((f) => f.length > 60).length / allFns.length) * 100) : 0,
    pctLargeFiles: qualityFiles.length ? r1((qualityFiles.filter((f) => f.loc > 600).length / qualityFiles.length) * 100) : 0,
    commentRatio: qLoc + qComments ? r2(qComments / (qLoc + qComments)) : 0,
    todoPerKloc: qLoc ? r1((todoCount / qLoc) * 1000) : 0,
    duplicationPercent: dup.percent, duplicatedLines: dup.duplicatedLines,
  };

  const langMap = new Map();
  for (const f of files) { const e = langMap.get(f.lang.name) ?? { name: f.lang.name, files: 0, loc: 0 }; e.files++; e.loc += f.loc; langMap.set(f.lang.name, e); }
  const languages = [...langMap.values()].sort((a, b) => b.loc - a.loc).map((l) => ({ ...l, percent: loc ? r1((l.loc / loc) * 100) : 0 }));

  const hotspots = qualityFiles.filter((f) => f.functions.length).map((f) => {
    const top = f.functions.reduce((a, b) => (b.complexity > a.complexity ? b : a));
    return { file: f.path, loc: f.loc, functions: f.functions.length, maxComplexity: top.complexity, avgComplexity: r1(f.functions.reduce((s, x) => s + x.complexity, 0) / f.functions.length), topFunction: { name: top.name, line: top.startLine, complexity: top.complexity, length: top.length }, score: r1(top.complexity * (1 + f.loc / 500)) };
  }).filter((h) => h.maxComplexity >= 8 || h.loc >= 400).sort((a, b) => b.score - a.score).slice(0, 10);
  const complexFunctions = [...allFns].sort((a, b) => b.complexity - a.complexity).slice(0, 10).map((f) => ({ name: f.name, file: f.file, line: f.startLine, endLine: f.endLine, complexity: f.complexity, length: f.length }));

  // ---- dependencies -----------------------------------------------------
  step('dependencies', 'Reading dependency manifests', 70);
  const manifests = manifestPaths.filter((p) => texts.has(p)).map((p) => ({ path: p, text: texts.get(p) }));
  const deps = analyseDependencies(manifests, allPaths);
  findings.push(...deps.findings);
  const manifestMeta = deps.ecosystems.map((e) => ({ path: e.manifest, meta: e.meta }));
  step('dependencies', 'Checking dependencies for known vulnerabilities', 74);
  const vulnerabilities = await checkVulnerabilities(deps.ecosystems, { fetchImpl, enabled: osvEnabled, signal: AbortSignal.timeout(20_000) });
  warnings.push(...vulnerabilities.warnings);
  findings.push(...vulnerabilityFindings(vulnerabilities.items));

  // ---- architecture, docs, testing -------------------------------------
  step('architecture', 'Mapping modules and imports', 80);
  const architecture = buildArchitecture(files, { allPaths, manifests: manifestMeta });
  const docs = analyseDocs({ paths: allPaths, readmeText: rootReadme ? texts.get(rootReadme) : '', licenseText: licensePath ? texts.get(licensePath) : '', meta: repo });
  const depNames = new Set(deps.ecosystems.flatMap((e) => e.deps.map((d) => d.name)));
  const testing = analyseTesting({ paths: allPaths, sourceFiles: files, dependencyNames: depNames, hasTestScript: deps.ecosystems.some((e) => e.meta?.hasTestScript) });

  // ---- repository activity ---------------------------------------------
  step('activity', 'Reading commit history and contributors', 86);
  const extras = await source.getExtras();
  const activity = source.kind === 'github' ? summariseActivity({ commitActivity: extras.commitActivity, contributors: extras.contributors, pulls: extras.pulls, repo, unavailableReason: extras.unavailableReason }) : { available: false, reason: extras.unavailableReason };
  if (source.kind === 'github' && activity.available && !activity.heatmap.available) warnings.push(warning('ACTIVITY_UNAVAILABLE', { reason: activity.reason ?? 'unknown' }));

  // ---- repository-level findings ---------------------------------------
  if (!docs.readme.exists) findings.push(repoFinding('DOC001', { message: 'No README file was found at the repository root.' }));
  else if (!docs.readme.sections.install || !docs.readme.sections.usage) findings.push(repoFinding('DOC002', { file: docs.readme.path, line: 1, message: `README has no ${[!docs.readme.sections.install && 'installation', !docs.readme.sections.usage && 'usage'].filter(Boolean).join(' or ')} section.` }));
  if (!docs.license.file && !docs.license.github) findings.push(repoFinding('DOC003', { message: 'No LICENSE file was found and GitHub reports no licence.' }));
  if (!docs.contributing) findings.push(repoFinding('DOC004', { message: 'No CONTRIBUTING file was found.' }));
  for (const p of docs.envFilesCommitted) findings.push(repoFinding('SEC008', { file: p, line: 1, message: `${p} is committed to the repository.` }));
  if (testing.testFiles === 0) findings.push(repoFinding('TEST001', { message: 'No test files or test folders were found.' }));
  else if (testing.sourceFiles >= 10 && testing.ratio < 0.1) findings.push(repoFinding('TEST003', { message: `Only ${testing.testFiles} test files for ${testing.sourceFiles} source files (ratio ${testing.ratio}).` }));
  if (!testing.ci.present) findings.push(repoFinding('TEST002', { message: 'No CI configuration (GitHub Actions, GitLab CI, CircleCI and others) was found.' }));
  if (activity.available) {
    if (activity.daysSincePush > 365) findings.push(repoFinding('MAINT001', { message: `The last push was ${Math.round(activity.daysSincePush)} days ago.` }));
    if (activity.contributors.busFactor === 1 && activity.contributors.total >= 20) findings.push(repoFinding('MAINT002', { message: `${activity.contributors.top[0]?.login} wrote ${Math.round(activity.contributors.topShare * 100)}% of the commits.` }));
    if (activity.pulls.medianMergeHours !== null && activity.pulls.medianMergeHours > 24 * 30) findings.push(repoFinding('MAINT003', { message: `Median time to merge a pull request is ${Math.round(activity.pulls.medianMergeHours / 24)} days.` }));
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.category.localeCompare(b.category) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
  findings.forEach((f, i) => { f.id = `F${i + 1}`; });
  const findingCounts = { total: findings.length, bySeverity: {}, byCategory: {} };
  for (const f of findings) { findingCounts.bySeverity[f.severity] = (findingCounts.bySeverity[f.severity] ?? 0) + 1; findingCounts.byCategory[f.category] = (findingCounts.byCategory[f.category] ?? 0) + 1; }

  step('score', 'Calculating the health score', 92);
  const score = scoreRepository({ metrics, activity, docs, testing, findings, dependencies: deps, vulnerabilities, meta: repo });

  const result = {
    source: { type: source.kind, slug: displayName, branch, url: repo.html_url || null },
    repo: { fullName: repo.full_name, name: repo.name, owner: repo.owner?.login ?? '', description: repo.description ?? '', htmlUrl: repo.html_url ?? '', homepage: repo.homepage ?? '', stars: repo.stargazers_count, forks: repo.forks_count, openIssues: repo.open_issues_count, license: repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : repo.license?.name ?? docs.license.detected ?? null, topics: repo.topics ?? [], archived: Boolean(repo.archived), createdAt: repo.created_at, pushedAt: repo.pushed_at, defaultBranch: repo.default_branch },
    coverage: { filesInRepository: allPaths.length, filesAnalysed: files.length, candidates: candidates.length, skippedLarge: tooLarge, skippedOverLimit: Math.max(0, overCap), skippedMinified: minified, failedDownloads: failed, maxFiles: limits.maxFiles, maxFileBytes: limits.maxFileBytes, truncatedTree: tree.truncated },
    languages, metrics, score, findings, findingCounts, hotspots, complexFunctions,
    duplication: { percent: dup.percent, blocks: dup.blocks },
    architecture, dependencies: { ecosystems: deps.ecosystems.map((e) => ({ ecosystem: e.ecosystem, manifest: e.manifest, lockfile: e.lockfile, error: e.error, deps: e.deps })), vulnerabilities: { status: vulnerabilities.status, reason: vulnerabilities.reason, checked: vulnerabilities.checked, items: vulnerabilities.items } },
    activity, docs, testing, warnings,
  };
  result.summary = buildExtractiveSummary(result, rootReadme ? texts.get(rootReadme) : '');

  step('index', 'Building the search index', 96);
  const index = buildIndex(chunkFiles(files, rootReadme ? [{ path: rootReadme, text: texts.get(rootReadme) ?? '' }] : []));
  return { result, internal: { index, readme: rootReadme ? texts.get(rootReadme) ?? '' : '', fileCount: files.length } };
}
