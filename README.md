# RepoLens: AI GitHub Repository Analyser

RepoLens analyses a public (or your own private) GitHub repository and produces a **full health report**: a score you can audit, every problem with its **file and line**, **why it matters**, **how to fix it** and **what happens if you ignore it**, an architecture map, a dependency and vulnerability check, repository activity, and a question-answering panel whose answers cite the code they came from.

It is the implementation of the research paper *Grounding LLM Explanations in Static Analysis and Repository Activity: A Hybrid Framework for GitHub Repository Analysis*.

## How it answers the research gap

| Gap in existing work | What RepoLens does |
|---|---|
| Activity and health metrics are numbers without explanation | Every score factor lists the exact evidence behind it, and every finding explains itself in plain language |
| LLM explanations of code hallucinate and miss repository-wide structure | The model is given only computed facts and retrieved code, must cite `[path:start-end]`, and every citation is **checked against the files that were analysed**. Unverifiable citations are flagged |
| Repository-level tools target completion or per-function docs, not an assessment | One pipeline produces summary, architecture, quality findings, dependency risk, maintenance health and Q&A together |

## Quick start

Requires **Node.js 20 or newer**. No database, no extra services.

```bash
npm install
npm run dev          # starts the API server and the website; open the address Vite prints
```

Open the site and click **Demo** to analyse a bundled sample project (it contains deliberate problems, so you can see file and line reporting immediately). To analyse a real repository paste `owner/name` or a GitHub link.

Optional but recommended: copy `.env.example` to `.env` and set

* `GITHUB_TOKEN` to lift the limit from 60 to 5,000 requests per hour (and to read private repositories you own). Without it, analysing a few repositories can hit the anonymous limit.
* a language model (see below) for model-written summaries and answers. **Without one, everything still works** and the app says clearly that text is extractive.

Restart the server after changing `.env`.

### Run as one server (no Vite)

```bash
npm run build
npm start            # serves the website and the API on http://localhost:8787
```

## What is analysed

| Area | How |
|---|---|
| Files | Up to `MAX_FILES` (250) source files up to `MAX_FILE_BYTES` (200 KB), downloaded from `raw.githubusercontent.com`; minified bundles are skipped |
| Languages | JavaScript, TypeScript, Python, Java, Kotlin, C#, Go, Rust, C, C++, PHP, Swift (functions and complexity); Ruby, Shell, HTML, CSS (size only) |
| Code metrics | Lines of code, comment ratio, functions, cyclomatic complexity, function length, nesting depth, parameters, duplicated blocks |
| Findings | 33 rules: secrets, unsafe code patterns, swallowed errors, TODO markers, complexity, duplication, dependency pinning, missing README/licence/tests/CI, inactive project, bus factor, Docker issues |
| Architecture | Import graph resolved to files, grouped into modules, circular dependencies, entry points, most-used libraries |
| Dependencies | `package.json`, `requirements*.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `pom.xml`; lock-file check; vulnerability lookup in [OSV.dev](https://osv.dev) |
| Activity | 52-week commit grid, contributors, bus factor, median pull-request merge time (GitHub API) |
| Retrieval | Code split into overlapping 40-line chunks, ranked with BM25; the file name counts as a hint |

### The health score

`S = 0.25·Q + 0.25·M + 0.15·D + 0.20·T + 0.15·R`

* **Q** code quality, **M** maintenance health, **D** documentation, **T** testing and CI, **R** dependency and security risk (higher is safer).
* Each factor is 0 to 100 and shows its evidence (click it). A factor that cannot be measured (for example maintenance for a project with no Git history) is left out and the other weights are rescaled. The weights are defined in `server/src/analysis/score.js`.

## Language model (optional)

| Provider | Settings |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY`, optionally `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`; set it to any model your account can use) |
| OpenAI or any OpenAI-compatible service | `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` |
| Free and local (Ollama) | `OPENAI_BASE_URL=http://localhost:11434/v1`, `OPENAI_MODEL=llama3.1`, no key |

The model receives only computed facts and retrieved code. If it fails (wrong key, quota, network, unreadable output) the analysis still completes with the extractive summary and a notice explains what to fix.

## Errors: what you see and how to fix them

Every failure has a **code**, a **message** and a **"How to resolve it"** hint, shown in the page.

* Problems with the analysed repository or services (GitHub, model, OSV) are listed in [docs/ERRORS.md](docs/ERRORS.md) with the fix for each. Non-fatal ones appear as notices above the report and do not stop the analysis.
* **Bugs in RepoLens itself** show the **file and line** where they happened, for example `server/src/analysis/engine.js:123:15` (server, shown in the page and the server terminal) or `src/pages/Analysis.jsx:42:7` (interface, shown by the error screen). Turn off server locations with `DEBUG=0`.
* If the server is not running, the website says so and lists the commands to start it.

## API

| Route | Purpose |
|---|---|
| `GET /api/health` | Server, token and model status |
| `POST /api/analyses` `{ "url": "owner/name" }` or `{ "url": "demo" }` | Start an analysis, returns `{ id }` |
| `GET /api/analyses/:id` | Progress (`stage`, `label`, `percent`) and, when done, the result |
| `POST /api/analyses/:id/ask` `{ "question": "..." }` | Answer with citations and evidence |
| `GET /api/analyses/:id/report.md` / `report.json` | Download the report |

Results are kept in memory for 2 hours (20 analyses at most) and are lost when the server restarts.

## Project structure

```
server/
  src/
    index.js, server.js, config.js, errors.js, store.js, report.js, parse.js
    sources/      github.js (GitHub REST + raw files), local.js (folder, used for the demo and tests)
    analysis/     engine.js (pipeline), lexer.js, functions.js, rules.js, duplication.js,
                  dependencies.js, architecture.js, project.js, activity.js, score.js, summary.js
    retrieval/    chunker.js, bm25.js
    llm/          client.js (Anthropic and OpenAI-compatible), grounding.js, summarize.js, qa.js
  fixtures/sample-repo/    demo project with deliberate problems
  test/                    34 tests (node:test)
src/                        React + Vite + Tailwind interface
  pages/        Home, Analysis, About, NotFound
  components/   layout/, home/, analysis/ (13 panels), ui/
  services/api.js, hooks/useAnalysis.js
scripts/        dev.js, run-tests.js, gen-error-docs.js
```

## Tests

```bash
npm test
```

34 tests cover the lexer and function extraction, every reported file and line on the sample project, secret masking, duplicate detection, import resolution, scoring, BM25 retrieval, the GitHub error mapping (404, rate limit, bad token, forbidden, empty repo, network), a full GitHub run against a fake network, OSV failure, the HTTP API, and the language-model path against fake Anthropic and OpenAI-style servers (including citation checking and fallback).

## Limits you should state in your report

* Static analysis uses a lightweight scanner, not a full compiler or Tree-sitter. Function boundaries and complexity are estimates, and pattern rules can produce false positives (each finding shows a confidence level).
* Very large repositories are sampled (`MAX_FILES`); the coverage notice says how many files were analysed.
* Test and CI detection relies on conventional names and folders.
* OSV lookups use the version in the manifest; ranges are marked approximate.
* Verified citations prove a file and line exist, not that the model's statement is correct.
* The live GitHub, OSV and language-model paths were tested against fake services, not against the real internet.
