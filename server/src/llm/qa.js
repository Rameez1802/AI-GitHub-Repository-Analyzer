import { complete, llmStatus } from './client.js';
import { SYSTEM_RULES, retrieveFor, evidenceBlock, verifyCitations, header } from './grounding.js';
import { search } from '../retrieval/bm25.js';

const INTENTS = [
  ['language', /(language|written|stack|tech|built with)/i], ['maintenance', /(maintain|active|alive|abandon|recent|update|dead|last (commit|push))/i],
  ['contributors', /(bus|contributor|team|maintainer|people|who (wrote|works))/i], ['testing', /(test|ci\b|pipeline|continuous)/i], ['license', /(licen[cs]e|legal|commercial)/i],
  ['docs', /(doc|readme|guide)/i], ['security', /(secret|password|key|vulnerab|security|unsafe|risk)/i], ['complexity', /(complex|hotspot|refactor|hard to|messy)/i],
  ['dependencies', /(depend|package|librar|outdated|lock)/i], ['architecture', /(architect|structure|module|folder|organi[sz]|entry|start|layout)/i], ['overall', /(score|health|overall|quality|good|safe)/i],
];

/** Answers from computed facts only. Returns { text, sources } or null when no intent matches. */
export function factAnswer(question, r) {
  const intent = INTENTS.find(([, re]) => re.test(question))?.[0];
  const factor = (letter) => r.score.factors.find((f) => f.letter === letter);
  switch (intent) {
    case 'language': return { text: r.languages.length ? `By lines of code: ${r.languages.slice(0, 4).map((l) => `${l.name} ${l.percent}%`).join(', ')}.` : 'No languages were detected.', sources: ['language analysis'] };
    case 'maintenance': { const m = factor('M'); return { text: m.applicable ? `${m.detail} Maintenance health scores ${m.score}/100.` : `Maintenance could not be measured: ${m.detail}`, sources: ['GitHub activity data'] }; }
    case 'contributors': { const a = r.activity; return { text: a.available ? `${a.contributors.count} contributors; the bus factor is ${a.contributors.busFactor} (that many people wrote at least half of the commits). Top contributor: ${a.contributors.top[0]?.login ?? 'unknown'} with ${Math.round(a.contributors.topShare * 100)}%.` : `Contributor data is not available: ${a.reason}`, sources: ['GitHub contributors'] }; }
    case 'testing': { const t = r.testing; return { text: `${t.testFiles} test files for ${t.sourceFiles} source files (ratio ${t.ratio}). Frameworks: ${t.frameworks.join(', ') || 'none detected'}. CI: ${t.ci.present ? t.ci.provider : 'none found'}.`, sources: ['file tree'] }; }
    case 'license': return { text: r.docs.license.file ? `A licence file exists (${r.docs.license.file}); detected type: ${r.docs.license.detected ?? 'unknown'}. Read the text before commercial use.` : 'No licence file was found, so no one has permission to reuse the code.', sources: ['file tree'] };
    case 'docs': { const d = r.docs.readme; return { text: d.exists ? `README present (${d.bytes} characters) with ${Object.entries(d.sections).filter(([, v]) => v).map(([k]) => k).join(', ') || 'no standard'} section(s).` : 'No README was found.', sources: ['README'] }; }
    case 'security': { const sec = r.findings.filter((f) => f.category === 'security'); return { text: sec.length ? `${sec.length} security findings, for example ${sec.slice(0, 3).map((f) => `${f.title} at ${f.file}${f.line ? ':' + f.line : ''}`).join('; ')}.` : 'No security findings were reported by the rules.', sources: ['static analysis rules'] }; }
    case 'complexity': return { text: r.hotspots.length ? `Most complex files: ${r.hotspots.slice(0, 3).map((h) => `${h.file} (max complexity ${h.maxComplexity}, ${h.topFunction.name}() at line ${h.topFunction.line})`).join('; ')}.` : 'No complexity hotspots were found.', sources: ['static analysis'] };
    case 'dependencies': { const ecos = r.dependencies.ecosystems; return { text: ecos.length ? `${ecos.map((e) => `${e.manifest}: ${e.deps.length} dependencies${e.lockfile ? '' : ', no lock file'}`).join('; ')}. Vulnerability check: ${r.dependencies.vulnerabilities.status}${r.dependencies.vulnerabilities.items.length ? `, ${r.dependencies.vulnerabilities.items.length} advisories` : ''}.` : 'No dependency manifests were found.', sources: ['manifests', 'OSV.dev'] }; }
    case 'architecture': return { text: `${r.architecture.modules.length} modules; largest: ${r.architecture.modules.slice(0, 3).map((m) => `${m.name} (${m.loc} lines)`).join(', ')}. Entry points: ${r.architecture.entryPoints.map((e) => e.file).join(', ') || 'none detected'}.`, sources: ['import analysis'] };
    case 'overall': { const weakest = [...r.score.factors].filter((f) => f.applicable).sort((a, b) => a.score - b.score)[0]; return { text: `Health score ${r.score.overall}/100 (grade ${r.score.grade}). The weakest area is ${weakest.label.toLowerCase()} at ${weakest.score}/100.`, sources: ['health score'] }; }
    default: return null;
  }
}

const excerpt = (h) => h.text.split('\n').slice(0, 6).join('\n');

export async function answerQuestion({ question, result, internal }) {
  const hits = search(internal.index, question, 6);
  const fact = factAnswer(question, result);
  const evidence = hits.map((h) => ({ file: h.file, startLine: h.startLine, endLine: h.endLine, score: h.score, excerpt: excerpt(h) }));

  if (llmStatus().configured) {
    const more = retrieveFor(internal.index, [question], 6);
    const user = ['QUESTION:', question, '', 'FACTS:', fact ? fact.text : '(none matched)', `Health score ${result.score.overall}/100.`, '', 'EVIDENCE:', evidenceBlock(more), '', 'Answer in at most 150 words. Cite evidence as [path:start-end].'].join('\n');
    const text = await complete({ system: SYSTEM_RULES, user, maxTokens: 600 });
    const { valid, invalid } = verifyCitations(text, internal.index);
    return { mode: 'llm', model: llmStatus().model, answer: text, citations: valid, unverifiedCitations: invalid, facts: fact?.sources ?? [], evidence };
  }

  if (fact) return { mode: 'extractive', answer: fact.text, citations: [], facts: fact.sources, evidence, note: 'Answered from computed facts. Configure a language model for free-form answers.' };
  if (!hits.length) return { mode: 'extractive', answer: 'I could not find anything about that in the analysed files.', citations: [], facts: [], evidence: [], note: 'No matching code or documentation.' };
  return { mode: 'extractive', answer: `These are the closest matches in the code: ${hits.slice(0, 3).map(header).join(', ')}.`, citations: hits.slice(0, 3).map((h) => ({ file: h.file, startLine: h.startLine, endLine: h.endLine })), facts: [], evidence, note: 'Keyword search only. Configure a language model to have these explained.' };
}
