import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from './config.js';
import { AppError, toErrorBody, warning } from './errors.js';
import { parseRepoInput } from './parse.js';
import { createJob, getJob, publicJob } from './store.js';
import { GitHubSource } from './sources/github.js';
import { LocalSource } from './sources/local.js';
import { analyseRepository } from './analysis/engine.js';
import { llmStatus } from './llm/client.js';
import { llmSummary } from './llm/summarize.js';
import { answerQuestion } from './llm/qa.js';
import { toMarkdown } from './report.js';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const DEMO_DIR = path.join(ROOT, 'server', 'fixtures', 'sample-repo');

function send(res, status, body, headers = {}) {
  const isString = typeof body === 'string' || Buffer.isBuffer(body);
  res.writeHead(status, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS', ...(isString ? {} : { 'content-type': 'application/json; charset=utf-8' }), ...headers });
  res.end(isString ? body : JSON.stringify(body));
}

function readBody(req, limit = 100_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new AppError('BODY_TOO_LARGE')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (cause) { reject(new AppError('BAD_JSON', {}, cause)); }
    });
    req.on('error', reject);
  });
}

export async function runJob(job, source, { fetchImpl } = {}) {
  try {
    const { result, internal } = await analyseRepository(source, {
      fetchImpl,
      onProgress: (p) => { job.status = 'running'; job.stage = p.stage; job.label = p.label; job.percent = p.percent; },
    });
    result.source.demo = Boolean(job.demo);
    const status = llmStatus();
    if (status.configured) {
      job.stage = 'summary'; job.label = `Writing the summary with ${status.model}`; job.percent = 97;
      try { result.summary = await llmSummary(result, internal); } catch (error) {
        result.warnings.push({ code: error.code ?? 'LLM_ERROR', message: error.message + (error.details?.providerMessage ? ` (${error.details.providerMessage})` : ''), hint: error.hint ?? '' });
      }
    } else result.warnings.push(warning('LLM_NOT_CONFIGURED'));
    job.result = result; job.internal = internal; job.status = 'done'; job.stage = 'done'; job.label = 'Analysis complete'; job.percent = 100;
  } catch (error) {
    job.status = 'error'; job.stage = 'error'; job.error = toErrorBody(error, { debug: config.debug });
    if (config.debug) console.error(`[analysis ${job.id.slice(0, 8)}] ${job.error.code}: ${job.error.message}${job.error.location ? ` at ${job.error.location.text}` : ''}`);
  }
}

async function handleApi(req, res, url, deps) {
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /api/health') {
    const llm = llmStatus();
    return send(res, 200, { ok: true, version: '1.0.0', llm: { configured: llm.configured, provider: llm.provider, model: llm.model }, github: { tokenConfigured: Boolean(config.githubToken) }, osv: config.osvEnabled, limits: config.limits });
  }

  if (route === 'POST /api/analyses') {
    const body = await readBody(req);
    const input = String(body.url ?? '').trim();
    let source, meta = {};
    if (input.toLowerCase() === 'demo') {
      source = new LocalSource(DEMO_DIR, { name: 'sample-shop', description: 'A tiny demo project with deliberate problems, so you can see how findings are reported.' });
      meta = { demo: true, source: { slug: 'sample-shop', type: 'local' } };
    } else {
      const parsed = parseRepoInput(input);
      if (!parsed) throw new AppError('INVALID_INPUT');
      source = deps.makeGithubSource ? deps.makeGithubSource(parsed) : new GitHubSource(parsed.owner, parsed.repo, { token: config.githubToken });
      meta = { source: { slug: `${parsed.owner}/${parsed.repo}`, type: 'github' } };
    }
    const job = createJob(meta);
    runJob(job, source, { fetchImpl: deps.fetchImpl }).catch(() => {});
    return send(res, 202, { id: job.id, status: job.status });
  }

  const m = url.pathname.match(/^\/api\/analyses\/([\w-]+)(?:\/(ask|report\.md|report\.json))?$/);
  if (m) {
    const job = getJob(m[1]);
    if (!job) throw new AppError('ANALYSIS_NOT_FOUND');
    const sub = m[2];
    if (!sub && req.method === 'GET') return send(res, 200, publicJob(job));
    if (sub && job.status !== 'done') throw job.status === 'error' ? new AppError('ANALYSIS_NOT_FOUND') : new AppError('ANALYSIS_NOT_READY');
    if (sub === 'ask' && req.method === 'POST') {
      const body = await readBody(req);
      const question = String(body.question ?? '').trim();
      if (!question) throw new AppError('QUESTION_EMPTY');
      return send(res, 200, await answerQuestion({ question: question.slice(0, 500), result: job.result, internal: job.internal }));
    }
    if (sub === 'report.md') return send(res, 200, toMarkdown(job.result), { 'content-type': 'text/markdown; charset=utf-8', 'content-disposition': `attachment; filename="${job.result.repo.name}-health-report.md"` });
    if (sub === 'report.json') return send(res, 200, JSON.stringify(job.result, null, 2), { 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${job.result.repo.name}-health-report.json"` });
  }
  throw new AppError('ROUTE_NOT_FOUND');
}

function serveStatic(req, res, url) {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) {
    return send(res, 200, '<!doctype html><meta charset="utf-8"><title>RepoLens API</title><body style="font-family:system-ui;max-width:40rem;margin:3rem auto"><h1>RepoLens server is running</h1><p>The web interface has not been built. For development run <code>npm run dev</code> and open the address Vite prints. To serve the interface from this server run <code>npm run build</code> and restart.</p><p><a href="/api/health">/api/health</a></p>', { 'content-type': 'text/html; charset=utf-8' });
  }
  let file = path.normalize(path.join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) return send(res, 403, 'Forbidden', { 'content-type': 'text/plain' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(dist, 'index.html');
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

export function createServer(deps = {}) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'OPTIONS') return send(res, 204, '');
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url, deps);
      return serveStatic(req, res, url);
    } catch (error) {
      const body = toErrorBody(error, { debug: config.debug });
      if (config.debug && body.status >= 500) console.error(`[server] ${body.code}: ${body.message} at ${body.location?.text ?? 'unknown location'}`);
      return send(res, body.status, { error: body });
    }
  });
}
