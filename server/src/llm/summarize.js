import { complete } from './client.js';
import { llmStatus } from './client.js';
import { AppError } from '../errors.js';
import { SYSTEM_RULES, retrieveFor, evidenceBlock, verifyCitations } from './grounding.js';

function factsFor(result) {
  const f = result.score.factors.map((x) => `${x.letter} ${x.label}: ${x.applicable ? x.score : 'not measured'} (${x.detail})`);
  const findings = result.findings.slice(0, 10).map((x) => `${x.severity} ${x.rule} ${x.file}${x.line ? ':' + x.line : ''} ${x.message}`);
  const mods = result.architecture.modules.slice(0, 8).map((m) => `${m.name}: ${m.loc} lines, depends on [${m.dependsOn.join(', ')}]`);
  return [
    `Repository: ${result.repo.fullName}. Description: ${result.repo.description || 'none'}.`,
    `Languages: ${result.languages.slice(0, 5).map((l) => `${l.name} ${l.percent}%`).join(', ')}. Lines of code: ${result.metrics.loc}. Files analysed: ${result.metrics.files}.`,
    `Health score: ${result.score.overall}/100 (grade ${result.score.grade}).`, ...f,
    `Entry points: ${result.architecture.entryPoints.map((e) => e.file).join(', ') || 'none detected'}.`,
    'Modules:', ...mods, 'Top findings:', ...findings,
  ].join('\n');
}

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AppError('LLM_BAD_OUTPUT');
  try { return JSON.parse(match[0]); } catch (cause) { throw new AppError('LLM_BAD_OUTPUT', {}, cause); }
}

/** Model-written summary, grounded in computed facts and retrieved code. Throws AppError on failure. */
export async function llmSummary(result, internal) {
  const hits = retrieveFor(internal.index, ['main entry point application start', 'core logic of the project', 'configuration and setup'], 3).slice(0, 7);
  const user = [
    'FACTS:', factsFor(result), '', 'README EXCERPT:', (internal.readme || 'No README.').slice(0, 2200), '', 'EVIDENCE:', evidenceBlock(hits), '',
    'Return ONLY a JSON object with this shape:',
    '{"overview":["2-3 sentences on what the project does"],"architecture":["2-4 sentences on how the code is organised, citing files"],"strengths":[{"text":"...","source":"path:line or factor letter"}],"risks":[{"text":"...","source":"path:line or factor letter"}]}',
  ].join('\n');
  const text = await complete({ system: SYSTEM_RULES, user, maxTokens: 1400 });
  const data = parseJson(text);
  const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const strs = (v) => arr(v).map((x) => (typeof x === 'string' ? x : x?.text ?? '')).filter(Boolean);
  const items = (v) => arr(v).map((x) => (typeof x === 'string' ? { text: x, source: '' } : { text: String(x.text ?? ''), source: String(x.source ?? '') })).filter((x) => x.text);
  const out = { mode: 'llm', model: llmStatus().model, overview: strs(data.overview), architecture: strs(data.architecture), strengths: items(data.strengths), risks: items(data.risks) };
  if (!out.overview.length) throw new AppError('LLM_BAD_OUTPUT');
  // Only bare "path:line" values in the model's `source` fields are wrapped in brackets;
  // citations the model already wrote in [brackets] inside sentences are left exactly as written.
  const bare = /^[\w@./+-]+\.\w+:\d+(?:-\d+)?$/;
  const asCitation = (src) => (bare.test(String(src).trim()) ? `[${String(src).trim()}]` : '');
  const all = [...out.overview, ...out.architecture, ...[...out.strengths, ...out.risks].map((s) => `${s.text} ${asCitation(s.source)}`)].join(' ');
  const { valid, invalid } = verifyCitations(all, internal.index);
  out.citations = valid;
  out.unverifiedCitations = invalid;
  return out;
}
