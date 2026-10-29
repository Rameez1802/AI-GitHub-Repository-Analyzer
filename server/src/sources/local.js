import fs from 'node:fs';
import path from 'node:path';

/** Reads a folder on disk. Used for the bundled demo repository and for tests. */
export class LocalSource {
  constructor(dir, { name = path.basename(dir), description = '' } = {}) {
    this.kind = 'local';
    this.dir = dir;
    this.slug = name;
    this.description = description;
  }

  async getMeta() {
    const repo = {
      full_name: this.slug, name: this.slug, owner: { login: 'local' }, description: this.description, html_url: '', homepage: '',
      stargazers_count: null, forks_count: null, open_issues_count: null, license: null, topics: [], archived: false, fork: false,
      pushed_at: null, created_at: null, default_branch: 'main', language: null,
    };
    return { repo, branch: 'main', displayName: this.slug };
  }

  async getTree() {
    const files = [];
    const walk = (rel) => {
      for (const entry of fs.readdirSync(path.join(this.dir, rel), { withFileTypes: true })) {
        const p = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        if (entry.isDirectory()) walk(p);
        else files.push({ path: p, size: fs.statSync(path.join(this.dir, p)).size });
      }
    };
    walk('');
    return { files, truncated: false };
  }

  async getFile(p) {
    try { return fs.readFileSync(path.join(this.dir, p), 'utf8'); } catch { return null; }
  }

  async getExtras() {
    return { commitActivity: [], contributors: [], pulls: [], unavailableReason: 'This source has no Git history' };
  }
}
