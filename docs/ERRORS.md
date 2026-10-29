# Error and warning catalogue

Generated from `server/src/errors.js` by `npm run docs:errors`. Placeholders such as `{repo}` are filled in at run time.

| Code | Status | What it means | How to resolve it |
|---|---|---|---|
| `INVALID_INPUT` | 400 | The repository link is not valid. | Use owner/name or a full link such as https://github.com/facebook/react. |
| `BODY_TOO_LARGE` | 413 | The request body is too large. | Send only the repository link or the question text. |
| `BAD_JSON` | 400 | The request body is not valid JSON. | Send a JSON body such as {"url":"owner/name"} with Content-Type: application/json. |
| `ROUTE_NOT_FOUND` | 404 | This API route does not exist. | Check the URL. Available routes are listed in the README under "API". |
| `REPO_NOT_FOUND` | 404 | Repository {repo} was not found on GitHub. | Check the spelling and that the repository is public. For a private repository, set GITHUB_TOKEN in .env to a token that can read it, then restart the server. |
| `GITHUB_RATE_LIMIT` | 429 | GitHub rate limit reached. | Anonymous requests are limited to 60 per hour. Create a token at https://github.com/settings/tokens (no scopes are needed for public repositories), put GITHUB_TOKEN=... in .env, and restart the server. The limit resets at {resetAt}. |
| `GITHUB_AUTH` | 401 | GitHub rejected the access token. | The GITHUB_TOKEN in .env is invalid or expired. Create a new token and restart the server. |
| `GITHUB_FORBIDDEN` | 403 | GitHub refused access to {repo}. | The repository may be private, blocked or require SSO authorisation for your token. Check the token permissions. |
| `GITHUB_NETWORK` | 502 | The server could not reach GitHub. | Check the internet connection of the machine running the server, proxy or firewall settings, then try again. |
| `GITHUB_ERROR` | 502 | GitHub returned an unexpected response ({status}). | Try again in a minute. If it keeps happening, check https://www.githubstatus.com. |
| `REPO_EMPTY` | 422 | The repository has no files to analyse. | Push some code to the default branch first, or choose another repository. |
| `NO_SOURCE_FILES` | 422 | No analysable source files were found in {repo}. | The repository may contain only documentation, data or unsupported file types. Supported languages are listed in the README. |
| `ANALYSIS_NOT_FOUND` | 404 | This analysis does not exist or has expired. | Results are kept in memory for 2 hours and are lost when the server restarts. Run the analysis again. |
| `ANALYSIS_NOT_READY` | 409 | The analysis is still running. | Wait until the status is "done", then try again. |
| `QUESTION_EMPTY` | 400 | The question is empty. | Type a question about the repository. |
| `LLM_AUTH` | 502 | The language-model provider rejected the API key. | Check the API key in .env (ANTHROPIC_API_KEY or OPENAI_API_KEY) and restart the server. The analysis continues without the model. |
| `LLM_MODEL` | 502 | The language-model provider does not know the model "{model}". | Set ANTHROPIC_MODEL (or OPENAI_MODEL) in .env to a model your account can use. |
| `LLM_RATE_LIMIT` | 502 | The language-model provider rate limit or quota was reached. | Wait a minute, or check your plan and billing. The analysis continues without the model. |
| `LLM_NETWORK` | 502 | The server could not reach the language-model provider. | Check the internet connection and, for OPENAI_BASE_URL, that the service is running (for example Ollama on localhost:11434). |
| `LLM_ERROR` | 502 | The language-model provider returned an error ({status}). | Try again later. The analysis continues without the model. |
| `LLM_BAD_OUTPUT` | 502 | The language model returned an answer that could not be read. | The extractive summary is shown instead. Try again, or use a more capable model. |
| `TREE_TRUNCATED` | warning | GitHub returned only part of the file list for this very large repository. | Results cover the files GitHub returned. Clone the repository locally for a complete analysis. |
| `FILES_SKIPPED` | warning | {count} source files were not analysed ({reason}). | Raise MAX_FILES or MAX_FILE_BYTES in .env to analyse more, at the cost of a longer run. |
| `FILE_FETCH_FAILED` | warning | {count} files could not be downloaded. | This is usually a temporary network or rate-limit problem. Run the analysis again. |
| `OSV_FAILED` | warning | The dependency vulnerability check could not run: {reason}. | The vulnerability section is marked "not checked". Check the internet connection to api.osv.dev and run again. |
| `OSV_SKIPPED` | warning | No dependencies with a usable version were found to check for vulnerabilities. | Pin dependency versions in the manifest so they can be checked. |
| `ACTIVITY_UNAVAILABLE` | warning | Commit activity is not available: {reason}. | GitHub computes statistics in the background. Run the analysis again in a minute. |
| `LLM_NOT_CONFIGURED` | warning | No language model is configured, so the summary is extractive. | Set ANTHROPIC_API_KEY, or OPENAI_API_KEY (works with Ollama and other OpenAI-compatible services), in .env and restart for model-written summaries and answers. |
| `INTERNAL` | 500 | An unexpected error occurred in the server. | This is a bug. Copy the "Where" line shown below and the message, and check that line in the source file. |
