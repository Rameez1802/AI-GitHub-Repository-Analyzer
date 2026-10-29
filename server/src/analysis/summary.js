const strip = (s) => s.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/[`*_>]/g, '').trim();

/** First real paragraph of the README (no badges, headings or code fences). */
export function readmeIntro(text) {
  if (!text) return '';
  const blocks = text.replace(/```[\s\S]*?```/g, '').split(/\n\s*\n/);
  for (const b of blocks) {
    const clean = strip(b.split('\n').filter((l) => !/^\s*#/.test(l) && !/^\s*[-=]{3,}\s*$/.test(l)).join(' '));
    if (clean.length >= 40) return clean.slice(0, 420);
  }
  return '';
}

/**
 * Deterministic summary built only from computed evidence. Used when no language
 * model is configured, or when the model fails. Every statement has a source.
 */
export function buildExtractiveSummary(result, readmeText) {
  const { repo, languages, metrics, architecture, score, findings } = result;
  const top = languages.slice(0, 3).map((l) => l.name);
  const intro = readmeIntro(readmeText);
  const overview = [
    `${repo.name} is ${top.length ? `a ${top[0]}` : 'a'} project${top.length > 1 ? ` that also uses ${top.slice(1).join(' and ')}` : ''}, with ${metrics.loc.toLocaleString('en')} lines of code in ${metrics.files} analysed files.`,
    intro ? `Its README says: ${intro}` : repo.description ? `Its description reads: ${repo.description}` : 'It has no README introduction or description, so its purpose could not be read from the documentation.',
  ];
  const mods = architecture.modules.slice(0, 4).map((m) => `${m.name} (${m.loc.toLocaleString('en')} lines)`);
  const architectureText = [
    mods.length ? `The code is organised into ${architecture.modules.length} module${architecture.modules.length === 1 ? '' : 's'}; the largest are ${mods.join(', ')}.` : 'No module structure could be derived.',
    architecture.entryPoints.length ? `Likely entry points: ${architecture.entryPoints.slice(0, 3).map((e) => e.file).join(', ')}.` : 'No entry point was detected.',
    architecture.cycles.length ? `Circular dependencies exist between modules: ${architecture.cycles[0].join(' ↔ ')}.` : '',
  ].filter(Boolean);

  const strengths = [], risks = [];
  for (const f of score.factors.filter((x) => x.applicable)) {
    if (f.score >= 75) strengths.push({ text: `${f.label}: ${f.detail}`, source: `score factor ${f.letter}` });
    else if (f.score < 50) risks.push({ text: `${f.label}: ${f.detail}`, source: `score factor ${f.letter}` });
  }
  for (const f of findings.filter((x) => x.severity === 'critical' || x.severity === 'high').slice(0, 3)) {
    risks.push({ text: `${f.title}${f.line ? ` at ${f.file}:${f.line}` : ` in ${f.file}`}`, source: `${f.file}${f.line ? ':' + f.line : ''}` });
  }
  return { mode: 'extractive', model: null, overview, architecture: architectureText, strengths, risks, citations: [] };
}
