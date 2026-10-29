import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Every error the server can report. `hint` tells the user how to resolve it.
 * Placeholders like {resetAt} are filled from `details`.
 */
export const ERROR_CATALOGUE = {
  INVALID_INPUT: { status: 400, message: 'The repository link is not valid.', hint: 'Use owner/name or a full link such as https://github.com/facebook/react.' },
  BODY_TOO_LARGE: { status: 413, message: 'The request body is too large.', hint: 'Send only the repository link or the question text.' },
  BAD_JSON: { status: 400, message: 'The request body is not valid JSON.', hint: 'Send a JSON body such as {"url":"owner/name"} with Content-Type: application/json.' },
  ROUTE_NOT_FOUND: { status: 404, message: 'This API route does not exist.', hint: 'Check the URL. Available routes are listed in the README under "API".' },

  REPO_NOT_FOUND: { status: 404, message: 'Repository {repo} was not found on GitHub.', hint: 'Check the spelling and that the repository is public. For a private repository, set GITHUB_TOKEN in .env to a token that can read it, then restart the server.' },
  GITHUB_RATE_LIMIT: { status: 429, message: 'GitHub rate limit reached.', hint: 'Anonymous requests are limited to 60 per hour. Create a token at https://github.com/settings/tokens (no scopes are needed for public repositories), put GITHUB_TOKEN=... in .env, and restart the server. The limit resets at {resetAt}.' },
  GITHUB_AUTH: { status: 401, message: 'GitHub rejected the access token.', hint: 'The GITHUB_TOKEN in .env is invalid or expired. Create a new token and restart the server.' },
  GITHUB_FORBIDDEN: { status: 403, message: 'GitHub refused access to {repo}.', hint: 'The repository may be private, blocked or require SSO authorisation for your token. Check the token permissions.' },
  GITHUB_NETWORK: { status: 502, message: 'The server could not reach GitHub.', hint: 'Check the internet connection of the machine running the server, proxy or firewall settings, then try again.' },
  GITHUB_ERROR: { status: 502, message: 'GitHub returned an unexpected response ({status}).', hint: 'Try again in a minute. If it keeps happening, check https://www.githubstatus.com.' },
  REPO_EMPTY: { status: 422, message: 'The repository has no files to analyse.', hint: 'Push some code to the default branch first, or choose another repository.' },
  NO_SOURCE_FILES: { status: 422, message: 'No analysable source files were found in {repo}.', hint: 'The repository may contain only documentation, data or unsupported file types. Supported languages are listed in the README.' },

  ANALYSIS_NOT_FOUND: { status: 404, message: 'This analysis does not exist or has expired.', hint: 'Results are kept in memory for 2 hours and are lost when the server restarts. Run the analysis again.' },
  ANALYSIS_NOT_READY: { status: 409, message: 'The analysis is still running.', hint: 'Wait until the status is "done", then try again.' },
  QUESTION_EMPTY: { status: 400, message: 'The question is empty.', hint: 'Type a question about the repository.' },

  LLM_AUTH: { status: 502, message: 'The language-model provider rejected the API key.', hint: 'Check the API key in .env (ANTHROPIC_API_KEY or OPENAI_API_KEY) and restart the server. The analysis continues without the model.' },
  LLM_MODEL: { status: 502, message: 'The language-model provider does not know the model "{model}".', hint: 'Set ANTHROPIC_MODEL (or OPENAI_MODEL) in .env to a model your account can use.' },
  LLM_RATE_LIMIT: { status: 502, message: 'The language-model provider rate limit or quota was reached.', hint: 'Wait a minute, or check your plan and billing. The analysis continues without the model.' },
  LLM_NETWORK: { status: 502, message: 'The server could not reach the language-model provider.', hint: 'Check the internet connection and, for OPENAI_BASE_URL, that the service is running (for example Ollama on localhost:11434).' },
  LLM_ERROR: { status: 502, message: 'The language-model provider returned an error ({status}).', hint: 'Try again later. The analysis continues without the model.' },
  LLM_BAD_OUTPUT: { status: 502, message: 'The language model returned an answer that could not be read.', hint: 'The extractive summary is shown instead. Try again, or use a more capable model.' },

  // Warnings (the analysis still completes)
  TREE_TRUNCATED: { status: 200, message: 'GitHub returned only part of the file list for this very large repository.', hint: 'Results cover the files GitHub returned. Clone the repository locally for a complete analysis.' },
  FILES_SKIPPED: { status: 200, message: '{count} source files were not analysed ({reason}).', hint: 'Raise MAX_FILES or MAX_FILE_BYTES in .env to analyse more, at the cost of a longer run.' },
  FILE_FETCH_FAILED: { status: 200, message: '{count} files could not be downloaded.', hint: 'This is usually a temporary network or rate-limit problem. Run the analysis again.' },
  OSV_FAILED: { status: 200, message: 'The dependency vulnerability check could not run: {reason}.', hint: 'The vulnerability section is marked "not checked". Check the internet connection to api.osv.dev and run again.' },
  OSV_SKIPPED: { status: 200, message: 'No dependencies with a usable version were found to check for vulnerabilities.', hint: 'Pin dependency versions in the manifest so they can be checked.' },
  ACTIVITY_UNAVAILABLE: { status: 200, message: 'Commit activity is not available: {reason}.', hint: 'GitHub computes statistics in the background. Run the analysis again in a minute.' },
  LLM_NOT_CONFIGURED: { status: 200, message: 'No language model is configured, so the summary is extractive.', hint: 'Set ANTHROPIC_API_KEY, or OPENAI_API_KEY (works with Ollama and other OpenAI-compatible services), in .env and restart for model-written summaries and answers.' },

  INTERNAL: { status: 500, message: 'An unexpected error occurred in the server.', hint: 'This is a bug. Copy the "Where" line shown below and the message, and check that line in the source file.' },
};

function fill(template, details = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (details[key] !== undefined ? String(details[key]) : `{${key}}`));
}

export class AppError extends Error {
  constructor(code, details = {}, cause) {
    const entry = ERROR_CATALOGUE[code] ?? ERROR_CATALOGUE.INTERNAL;
    super(fill(entry.message, details));
    this.name = 'AppError';
    this.code = ERROR_CATALOGUE[code] ? code : 'INTERNAL';
    this.status = entry.status;
    this.hint = fill(entry.hint, details);
    this.details = details;
    if (cause) this.cause = cause;
  }
}

/** A non-fatal problem attached to a finished analysis. */
export function warning(code, details = {}) {
  const entry = ERROR_CATALOGUE[code];
  return { code, message: fill(entry.message, details), hint: fill(entry.hint, details) };
}

/** First stack frame that belongs to this project, as "server/src/file.js:LINE:COL". */
export function locationFromStack(stack) {
  if (!stack) return null;
  for (const line of String(stack).split('\n').slice(1)) {
    const match = line.match(/\(?((?:file:\/\/)?[^()\s]+):(\d+):(\d+)\)?\s*$/);
    if (!match) continue;
    let file = match[1].replace(/^file:\/\//, '');
    if (file.includes('node_modules') || file.startsWith('node:')) continue;
    file = path.relative(ROOT, file) || file;
    return { file, line: Number(match[2]), column: Number(match[3]), text: `${file}:${match[2]}:${match[3]}` };
  }
  return null;
}

export function toErrorBody(error, { debug = true } = {}) {
  const known = error instanceof AppError;
  const err = known ? error : new AppError('INTERNAL', {}, error);
  const original = known ? error : error;
  const body = { code: err.code, message: known ? err.message : `${err.message} (${error?.message ?? 'unknown error'})`, hint: err.hint, status: err.status };
  if (known && err.details && Object.keys(err.details).length) body.details = err.details;
  if (debug) {
    const where = locationFromStack(original?.stack) || locationFromStack(err.stack);
    if (where) body.location = where;
    if (!known && original?.stack) body.stack = String(original.stack).split('\n').slice(0, 6).join('\n');
  }
  return body;
}
