const sev = { critical: 'CRITICAL', high: 'HIGH', medium: 'MEDIUM', low: 'LOW', info: 'INFO' };
const at = (f) => (f.line ? `${f.file}:${f.line}${f.endLine && f.endLine !== f.line ? `-${f.endLine}` : ''}` : f.file);

export function toMarkdown(r) {
  const out = [];
  const L = (s = '') => out.push(s);
  L(`# Repository health report: ${r.repo.fullName}`);
  L();
  L(`Generated ${new Date().toISOString().slice(0, 10)} by RepoLens. Scores are indicative, not definitive.`);
  L();
  L(`## Overall score: ${r.score.overall}/100 (grade ${r.score.grade}, ${r.score.label})`);
  L();
  L('| Factor | Score | Weight | Why |');
  L('|---|---|---|---|');
  for (const f of r.score.factors) L(`| ${f.letter} ${f.label} | ${f.applicable ? f.score : 'n/a'} | ${Math.round(f.effectiveWeight * 100)}% | ${f.detail} |`);
  L();
  L(`Formula: ${r.score.formula}`);
  L();
  L('## Summary');
  L();
  L(`*${r.summary.mode === 'llm' ? `Written by ${r.summary.model} from the evidence below` : 'Extractive summary built from computed evidence (no language model)'}.*`);
  L();
  for (const p of [...r.summary.overview, ...r.summary.architecture]) L(p), L();
  if (r.summary.strengths.length) { L('**Strengths**'); L(); for (const s of r.summary.strengths) L(`- ${s.text}${s.source ? ` (${s.source})` : ''}`); L(); }
  if (r.summary.risks.length) { L('**Risks**'); L(); for (const s of r.summary.risks) L(`- ${s.text}${s.source ? ` (${s.source})` : ''}`); L(); }

  L(`## Findings (${r.findingCounts.total})`);
  L();
  L(Object.entries(r.findingCounts.bySeverity).map(([k, v]) => `${v} ${k}`).join(', ') || 'No findings.');
  L();
  for (const f of r.findings) {
    L(`### ${f.id} [${sev[f.severity]}] ${f.title}`);
    L();
    L(`- **Where:** \`${at(f)}\``);
    L(`- **What:** ${f.message}`);
    L(`- **Why it matters:** ${f.why}`);
    L(`- **How to fix:** ${f.fix}`);
    L(`- **If ignored:** ${f.ifIgnored}`);
    if (f.snippet) { L(); L('```'); for (const s of f.snippet) L(`${String(s.n).padStart(4)} ${s.hit ? '>' : ' '} ${s.text}`); L('```'); }
    L();
  }

  L('## Hotspots');
  L();
  if (r.hotspots.length) { L('| File | Lines | Max complexity | Most complex function |'); L('|---|---|---|---|'); for (const h of r.hotspots) L(`| ${h.file} | ${h.loc} | ${h.maxComplexity} | ${h.topFunction.name}() at line ${h.topFunction.line} |`); } else L('None.');
  L();
  L('## Architecture');
  L();
  L('| Module | Files | Lines | Depends on | Used by |');
  L('|---|---|---|---|---|');
  for (const m of r.architecture.modules) L(`| ${m.name} | ${m.files} | ${m.loc} | ${m.dependsOn.join(', ') || '-'} | ${m.usedBy.join(', ') || '-'} |`);
  L();
  if (r.architecture.cycles.length) L(`Circular dependencies: ${r.architecture.cycles.map((c) => c.join(' ↔ ')).join('; ')}`), L();
  L('## Dependencies');
  L();
  for (const e of r.dependencies.ecosystems) L(`- ${e.manifest}: ${e.deps.length} dependencies, lock file: ${e.lockfile ?? 'none'}`);
  L();
  L(`Vulnerability check: ${r.dependencies.vulnerabilities.status}${r.dependencies.vulnerabilities.reason ? ` (${r.dependencies.vulnerabilities.reason})` : ''}.`);
  for (const v of r.dependencies.vulnerabilities.items) L(`- ${v.package}@${v.version}: ${v.id} (${v.severity}) ${v.summary}${v.fixedIn ? ` Fixed in ${v.fixedIn}.` : ''}`);
  L();
  L('## Coverage and warnings');
  L();
  L(`Analysed ${r.coverage.filesAnalysed} of ${r.coverage.candidates} candidate source files (${r.coverage.filesInRepository} files in the repository).`);
  for (const w of r.warnings) L(`- **${w.code}:** ${w.message} ${w.hint}`);
  return out.join('\n');
}
