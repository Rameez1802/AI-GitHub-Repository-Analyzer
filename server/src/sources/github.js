import { AppError } from '../errors.js';

const API = 'https://api.github.com';

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

export class GitHubSource {
  constructor(owner, repo, { token = '', fetchImpl = fetch } = {}) {
    this.kind = 'github';
    this.owner = owner;
    this.name = repo;
    this.token = token;
    this.fetch = fetchImpl;
    this.branch = null;
    this.slug = `${owner}/${repo}`;
  }

  headers(extra = {}) {
    const h = { Accept: 'application/vnd.github+json', 'User-Agent': 'repolens-analyser', 'X-GitHub-Api-Version': '2022-11-28', ...extra };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  async api(path, { retries = 0, extraHeaders } = {}) {
    let res;
    try {
      res = await this.fetch(`${API}${path}`, { headers: this.headers(extraHeaders) });
    } catch (cause) {
      throw new AppError('GITHUB_NETWORK', {}, cause);
    }
    if (res.status === 202 && retries > 0) {
      await new Promise((r) => setTimeout(r, 1500));
      return this.api(path, { retries: retries - 1, extraHeaders });
    }
    if (res.status === 202) return { pending: true };
    if (res.status === 204) return null;
    if (!res.ok) throw await this.mapError(res);
    return res.json();
  }

  async mapError(res) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    const remaining = res.headers.get?.('x-ratelimit-remaining');
    const reset = Number(res.headers.get?.('x-ratelimit-reset')) * 1000;
    if (res.status === 404) return new AppError('REPO_NOT_FOUND', { repo: this.slug });
    if (res.status === 401) return new AppError('GITHUB_AUTH');
    if (res.status === 409) return new AppError('REPO_EMPTY');
    if (res.status === 429 || (res.status === 403 && (remaining === '0' || /rate limit/i.test(body)))) {
      return new AppError('GITHUB_RATE_LIMIT', { resetAt: reset ? new Date(reset).toLocaleTimeString() : 'about an hour from now' });
    }
    if (res.status === 403) return new AppError('GITHUB_FORBIDDEN', { repo: this.slug });
    return new AppError('GITHUB_ERROR', { status: res.status });
  }

  async getMeta() {
    const repo = await this.api(`/repos/${encodePath(this.owner)}/${encodePath(this.name)}`);
    this.branch = repo.default_branch;
    this.slug = repo.full_name;
    return { repo, branch: this.branch, displayName: repo.full_name };
  }

  async getTree() {
    const data = await this.api(`/repos/${this.slug}/git/trees/${encodeURIComponent(this.branch)}?recursive=1`);
    const files = (data.tree ?? []).filter((n) => n.type === 'blob').map((n) => ({ path: n.path, size: n.size ?? 0 }));
    return { files, truncated: Boolean(data.truncated) };
  }

  async getFile(path) {
    const rawUrl = `https://raw.githubusercontent.com/${this.slug}/${encodeURIComponent(this.branch)}/${encodePath(path)}`;
    try {
      const res = await this.fetch(rawUrl, { headers: this.token ? { Authorization: `Bearer ${this.token}`, 'User-Agent': 'repolens-analyser' } : { 'User-Agent': 'repolens-analyser' } });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch { /* fall through to the API */ }
    try {
      const res = await this.fetch(`${API}/repos/${this.slug}/contents/${encodePath(path)}?ref=${encodeURIComponent(this.branch)}`, { headers: this.headers({ Accept: 'application/vnd.github.raw+json' }) });
      if (res.ok) return await res.text();
    } catch { /* give up on this file */ }
    return undefined; // undefined = failed, null = does not exist
  }

  async getExtras() {
    const base = `/repos/${this.slug}`;
    const soft = async (p, opts) => { try { return await this.api(p, opts); } catch (e) { if (e.code === 'GITHUB_RATE_LIMIT') throw e; return { failed: e }; } };
    const [activity, contributors, pulls] = await Promise.all([
      soft(`${base}/stats/commit_activity`, { retries: 3 }),
      soft(`${base}/contributors?per_page=100`),
      soft(`${base}/pulls?state=closed&per_page=30&sort=updated&direction=desc`),
    ]);
    const list = (x) => (Array.isArray(x) ? x : []);
    let reason = null;
    if (activity?.pending) reason = 'GitHub is still computing weekly statistics';
    else if (activity?.failed) reason = activity.failed.message;
    return { commitActivity: list(activity), contributors: list(contributors), pulls: list(pulls), unavailableReason: reason };
  }
}
