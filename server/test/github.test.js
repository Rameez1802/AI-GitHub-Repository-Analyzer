import test from 'node:test';
import assert from 'node:assert/strict';
import { GitHubSource } from '../src/sources/github.js';
import { analyseRepository } from '../src/analysis/engine.js';
import { checkVulnerabilities } from '../src/analysis/dependencies.js';
import { AppError, toErrorBody, locationFromStack } from '../src/errors.js';
import { mockResponse, fakeFetch } from './helpers.js';

const meta = { full_name: 'acme/widget', name: 'widget', owner: { login: 'acme' }, description: 'Widgets', html_url: 'https://github.com/acme/widget', stargazers_count: 10, forks_count: 2, open_issues_count: 1, license: { spdx_id: 'MIT' }, topics: ['a'], archived: false, pushed_at: new Date(Date.now() - 5 * 86400000).toISOString(), created_at: '2020-01-01T00:00:00Z', default_branch: 'main' };
const week = (i) => ({ week: 1700000000 + i * 604800, total: 7, days: [1, 1, 1, 1, 1, 1, 1] });

const happy = () => fakeFetch([
  ['api.github.com/repos/acme/widget/git/trees', mockResponse(200, { truncated: false, tree: [{ path: 'src/a.js', type: 'blob', size: 120 }, { path: 'README.md', type: 'blob', size: 50 }, { path: 'package.json', type: 'blob', size: 90 }, { path: 'src', type: 'tree' }] })],
  ['api.github.com/repos/acme/widget/stats/commit_activity', mockResponse(200, Array.from({ length: 52 }, (_, i) => week(i)))],
  ['api.github.com/repos/acme/widget/contributors', mockResponse(200, [{ login: 'amy', contributions: 60 }, { login: 'bo', contributions: 40 }])],
  ['api.github.com/repos/acme/widget/pulls', mockResponse(200, [{ created_at: '2024-01-01T00:00:00Z', merged_at: '2024-01-02T00:00:00Z' }])],
  ['api.github.com/repos/acme/widget', mockResponse(200, meta)],
  ['raw.githubusercontent.com/acme/widget/main/src/a.js', mockResponse(200, 'export function a(x) {\n  if (x) { return 1; }\n  return 2;\n}\n')],
  ['raw.githubusercontent.com/acme/widget/main/README.md', mockResponse(200, '# Widget\nA widget library for testing purposes only.\n')],
  ['raw.githubusercontent.com/acme/widget/main/package.json', mockResponse(200, '{"name":"widget","dependencies":{"lodash":"4.17.15"}}')],
  ['api.osv.dev/v1/querybatch', mockResponse(200, { results: [{ vulns: [{ id: 'GHSA-test-0001' }] }] })],
  ['api.osv.dev/v1/vulns/GHSA-test-0001', mockResponse(200, { id: 'GHSA-test-0001', summary: 'Prototype pollution', database_specific: { severity: 'HIGH' }, affected: [{ ranges: [{ events: [{ introduced: '0' }, { fixed: '4.17.21' }] }] }] })],
]);

test('full GitHub run with a fake network: activity, vulnerabilities and score', async () => {
  const fetchImpl = happy();
  const source = new GitHubSource('acme', 'widget', { fetchImpl });
  const { result } = await analyseRepository(source, { fetchImpl, osvEnabled: true });
  assert.equal(result.repo.fullName, 'acme/widget');
  assert.equal(result.activity.available, true);
  assert.equal(result.activity.contributors.busFactor, 1);
  assert.equal(result.activity.pulls.medianMergeHours, 24);
  const vuln = result.findings.find((f) => f.rule === 'DEP003');
  assert.ok(vuln, 'vulnerability becomes a finding');
  assert.equal(vuln.file, 'package.json');
  assert.match(vuln.message, /4\.17\.21/);
  assert.equal(result.dependencies.vulnerabilities.status, 'checked');
  const m = result.score.factors.find((f) => f.letter === 'M');
  assert.equal(m.applicable, true);
});

test('404 becomes REPO_NOT_FOUND with a hint', async () => {
  const source = new GitHubSource('nobody', 'nothing', { fetchImpl: fakeFetch([]) });
  await assert.rejects(() => source.getMeta(), (e) => e instanceof AppError && e.code === 'REPO_NOT_FOUND' && /public/.test(e.hint));
});

test('rate limit becomes GITHUB_RATE_LIMIT and tells the user about GITHUB_TOKEN', async () => {
  const reset = String(Math.floor(Date.now() / 1000) + 600);
  const source = new GitHubSource('a', 'b', { fetchImpl: fakeFetch([['api.github.com', mockResponse(403, { message: 'API rate limit exceeded' }, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset })]]) });
  await assert.rejects(() => source.getMeta(), (e) => e.code === 'GITHUB_RATE_LIMIT' && /GITHUB_TOKEN/.test(e.hint) && !/\{resetAt\}/.test(e.hint));
});

test('bad token, forbidden, empty repository and server error are told apart', async () => {
  const cases = [[401, {}, 'GITHUB_AUTH'], [403, { message: 'Resource not accessible' }, 'GITHUB_FORBIDDEN'], [409, { message: 'Git Repository is empty.' }, 'REPO_EMPTY'], [500, {}, 'GITHUB_ERROR']];
  for (const [status, body, code] of cases) {
    const source = new GitHubSource('a', 'b', { fetchImpl: fakeFetch([['api.github.com', mockResponse(status, body)]]) });
    await assert.rejects(() => source.getMeta(), (e) => e.code === code, `${status} -> ${code}`);
  }
});

test('network failure becomes GITHUB_NETWORK', async () => {
  const source = new GitHubSource('a', 'b', { fetchImpl: async () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(() => source.getMeta(), (e) => e.code === 'GITHUB_NETWORK');
});

test('OSV failure is reported as a warning, not a crash', async () => {
  const out = await checkVulnerabilities([{ manifest: 'package.json', deps: [{ ecosystem: 'npm', name: 'x', version: '1.0.0', exact: true, unpinned: false, line: 3 }] }], { fetchImpl: async () => mockResponse(500, {}) });
  assert.equal(out.status, 'failed');
  assert.equal(out.warnings[0].code, 'OSV_FAILED');
});

test('unexpected errors carry the source file and line', () => {
  function boom() { throw new Error('kaput'); }
  let err; try { boom(); } catch (e) { err = e; }
  const loc = locationFromStack(err.stack);
  assert.match(loc.file, /github\.test\.js$/);
  assert.ok(loc.line > 0);
  const body = toErrorBody(err, { debug: true });
  assert.equal(body.code, 'INTERNAL');
  assert.match(body.location.text, /github\.test\.js:\d+:\d+/);
  assert.equal(toErrorBody(err, { debug: false }).location, undefined);
});
