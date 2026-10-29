import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Minimal .env loader (no dependency). Existing environment variables win.
function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined && value !== '') process.env[key] = value;
  }
}
loadDotEnv();

const num = (value, fallback) => (Number.isFinite(Number(value)) && value !== undefined && value !== '' ? Number(value) : fallback);

export const config = {
  port: num(process.env.PORT, 8787),
  debug: process.env.DEBUG !== '0',
  githubToken: process.env.GITHUB_TOKEN || '',
  limits: {
    maxFiles: num(process.env.MAX_FILES, 250),
    maxFileBytes: num(process.env.MAX_FILE_BYTES, 200_000),
    concurrency: num(process.env.FETCH_CONCURRENCY, 8),
  },
  llm: {
    provider: process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL ? 'openai' : 'none'),
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
    openaiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    openaiBaseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    timeoutMs: num(process.env.LLM_TIMEOUT_MS, 60_000),
  },
  osvEnabled: process.env.OSV !== '0',
  keepAnalysesMs: 2 * 60 * 60 * 1000,
  maxStoredAnalyses: 20,
};
