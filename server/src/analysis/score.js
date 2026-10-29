const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const round = (n) => Math.round(n);

// Weights follow the paper's formula S = w1*Q + w2*M + w3*D + w4*T + w5*R
export const WEIGHTS = { quality: 0.25, maintenance: 0.25, documentation: 0.15, testing: 0.2, risk: 0.15 };
export const FORMULA = 'S = 0.25·Q + 0.25·M + 0.15·D + 0.20·T + 0.15·R (each factor scaled 0–100; factors that cannot be measured are left out and the remaining weights are rescaled)';

export function gradeFor(s) { return s >= 85 ? 'A' : s >= 70 ? 'B' : s >= 55 ? 'C' : s >= 40 ? 'D' : 'E'; }
export const labelFor = (s) => (s >= 70 ? 'Healthy' : s >= 50 ? 'Fair' : 'At risk');

export function scoreRepository({ metrics, activity, docs, testing, findings, dependencies, vulnerabilities, meta }) {
  const factors = [];

  // ---- Q: code quality -------------------------------------------------
  if (metrics.functions >= 3) {
    const ev = [];
    const p1 = clamp((metrics.avgComplexity - 4) * 5, 0, 25); ev.push(`Average complexity ${metrics.avgComplexity} → −${round(p1)}`);
    const p2 = clamp(metrics.pctComplex * 0.6, 0, 20); ev.push(`${metrics.pctComplex}% of functions above complexity 15 → −${round(p2)}`);
    const p3 = clamp(metrics.pctLong * 0.5, 0, 15); ev.push(`${metrics.pctLong}% of functions longer than 60 lines → −${round(p3)}`);
    const p4 = clamp(metrics.duplicationPercent, 0, 15); ev.push(`${metrics.duplicationPercent}% duplicated code → −${round(p4)}`);
    const p5 = clamp(metrics.pctLargeFiles * 0.5, 0, 10); ev.push(`${metrics.pctLargeFiles}% of files over 600 lines → −${round(p5)}`);
    const p6 = metrics.commentRatio < 0.03 ? 5 : 0; ev.push(`Comment ratio ${(metrics.commentRatio * 100).toFixed(1)}% → −${p6}`);
    const p7 = clamp(metrics.todoPerKloc, 0, 5); ev.push(`${metrics.todoPerKloc} TODO/FIXME per 1,000 lines → −${round(p7)}`);
    const q = clamp(100 - (p1 + p2 + p3 + p4 + p5 + p6 + p7));
    factors.push({ id: 'quality', letter: 'Q', label: 'Code quality', weight: WEIGHTS.quality, score: round(q), applicable: true, detail: `${metrics.functions} functions measured; average complexity ${metrics.avgComplexity}, ${metrics.duplicationPercent}% duplication.`, evidence: ev });
  } else {
    factors.push({ id: 'quality', letter: 'Q', label: 'Code quality', weight: WEIGHTS.quality, score: null, applicable: false, detail: 'Too few functions were found to measure code quality.', evidence: [] });
  }

  // ---- M: maintenance --------------------------------------------------
  if (activity.available) {
    const ev = [];
    const d = activity.daysSincePush ?? 9999;
    const recency = d <= 30 ? 100 : d <= 90 ? 85 : d <= 180 ? 65 : d <= 365 ? 40 : d <= 730 ? 20 : 5;
    ev.push(`Last push ${round(d)} days ago → recency ${recency}`);
    const hasWeeks = activity.heatmap.available;
    const steady = hasWeeks ? (activity.heatmap.recentActiveWeeks / Math.max(1, activity.heatmap.recentWeekCount)) * 100 : recency;
    ev.push(hasWeeks ? `Commits in ${activity.heatmap.recentActiveWeeks} of the last ${activity.heatmap.recentWeekCount} weeks → steadiness ${round(steady)}` : 'Weekly commit data unavailable, steadiness set to recency');
    const bf = activity.contributors.busFactor;
    const spread = activity.contributors.count === 0 ? 40 : ({ 1: 25, 2: 50, 3: 75, 4: 90 }[bf] ?? 100);
    ev.push(`Bus factor ${bf} → contributor spread ${spread}`);
    let m = 0.45 * recency + 0.3 * steady + 0.25 * spread;
    const med = activity.pulls.medianMergeHours;
    if (med !== null) { const pen = med > 24 * 30 ? 10 : med > 24 * 14 ? 5 : 0; m -= pen; ev.push(`Median pull-request merge time ${round(med / 24)} days → −${pen}`); }
    if (meta?.archived) { m = Math.min(m, 10); ev.push('Repository is archived → capped at 10'); }
    factors.push({ id: 'maintenance', letter: 'M', label: 'Maintenance health', weight: WEIGHTS.maintenance, score: round(clamp(m)), applicable: true, detail: `Last push ${round(d)} days ago; bus factor ${bf}.`, evidence: ev });
  } else {
    factors.push({ id: 'maintenance', letter: 'M', label: 'Maintenance health', weight: WEIGHTS.maintenance, score: null, applicable: false, detail: activity.reason ?? 'No repository history is available.', evidence: [] });
  }

  // ---- D: documentation ------------------------------------------------
  {
    const ev = []; let d = 0;
    if (docs.readme.exists) { d += 30; ev.push('README present +30'); } else ev.push('No README +0');
    for (const [k, pts] of [['install', 10], ['usage', 10], ['license', 5]]) if (docs.readme.sections[k]) { d += pts; ev.push(`README has a ${k} section +${pts}`); }
    if (docs.readme.bytes >= 1500) { d += 10; ev.push('README is detailed (1.5 KB or more) +10'); }
    if (docs.license.file) { d += 10; ev.push('Licence file present +10'); }
    if (docs.contributing) { d += 5; ev.push('CONTRIBUTING guide +5'); }
    if (docs.changelog) { d += 5; ev.push('Changelog +5'); }
    if (docs.docsFolder) { d += 5; ev.push('docs/ folder +5'); }
    if (metrics.commentRatio >= 0.05) { d += 10; ev.push(`Comment ratio ${(metrics.commentRatio * 100).toFixed(1)}% (5% or more) +10`); }
    factors.push({ id: 'documentation', letter: 'D', label: 'Documentation', weight: WEIGHTS.documentation, score: round(clamp(d)), applicable: true, detail: docs.readme.exists ? `README has ${Object.values(docs.readme.sections).filter(Boolean).length} of 4 expected sections.` : 'No README found.', evidence: ev });
  }

  // ---- T: testing and CI -----------------------------------------------
  {
    const ev = []; let t = 0;
    if (testing.testFiles > 0) { t += 30; ev.push(`${testing.testFiles} test files found +30`); } else ev.push('No test files +0');
    const ratioPts = clamp((testing.ratio / 0.3) * 30, 0, 30); t += ratioPts; ev.push(`Test-to-source file ratio ${testing.ratio} → +${round(ratioPts)}`);
    if (testing.ci.present) { t += 25; ev.push(`CI configured (${testing.ci.provider}) +25`); } else ev.push('No CI configuration +0');
    if (testing.frameworks.length || testing.hasTestScript) { t += 15; ev.push(`Test tooling detected (${testing.frameworks.join(', ') || 'npm test script'}) +15`); }
    factors.push({ id: 'testing', letter: 'T', label: 'Testing and CI', weight: WEIGHTS.testing, score: round(clamp(t)), applicable: true, detail: `${testing.testFiles} test files for ${testing.sourceFiles} source files; ${testing.ci.present ? 'CI present' : 'no CI'}.`, evidence: ev });
  }

  // ---- R: dependency and security risk (higher score = lower risk) -------
  {
    const ev = []; let r = 100;
    const secrets = findings.filter((f) => f.rule === 'SEC001'); const crit = secrets.filter((f) => f.severity === 'critical').length; const high = secrets.length - crit;
    const sp = clamp(crit * 40 + high * 25, 0, 60); if (sp) { r -= sp; ev.push(`${secrets.length} possible hard-coded secrets → −${sp}`); }
    const envp = docs.envFilesCommitted.length ? 25 : 0; if (envp) { r -= envp; ev.push(`.env file committed → −${envp}`); }
    const risky = findings.filter((f) => /^SEC00[2-7]$/.test(f.rule)).length; const rp = clamp(risky * 5, 0, 20); if (rp) { r -= rp; ev.push(`${risky} risky code patterns → −${rp}`); }
    const vp = clamp(vulnerabilities.items.reduce((s, v) => s + ({ critical: 20, high: 12, medium: 6, low: 2 }[v.severity] ?? 4), 0), 0, 40); if (vp) { r -= vp; ev.push(`${vulnerabilities.items.length} known vulnerable dependencies → −${vp}`); }
    const unp = findings.filter((f) => f.rule === 'DEP001').length; const up = clamp(unp * 2, 0, 10); if (up) { r -= up; ev.push(`${unp} unpinned dependencies → −${up}`); }
    if (findings.some((f) => f.rule === 'DEP002')) { r -= 8; ev.push('No lock file → −8'); }
    if (!docs.license.file && !docs.license.github) { r -= 10; ev.push('No licence → −10'); }
    if (!ev.length) ev.push('No risk indicators found');
    const note = vulnerabilities.status === 'checked' ? '' : ` Dependency vulnerabilities were not checked (${vulnerabilities.reason ?? vulnerabilities.status}).`;
    factors.push({ id: 'risk', letter: 'R', label: 'Dependency and security risk', weight: WEIGHTS.risk, score: round(clamp(r)), applicable: true, detail: `${secrets.length} possible secrets, ${risky} risky patterns, ${vulnerabilities.items.length} vulnerable dependencies.${note}`, evidence: ev });
  }

  const used = factors.filter((f) => f.applicable);
  const wsum = used.reduce((s, f) => s + f.weight, 0);
  const overall = round(used.reduce((s, f) => s + f.score * f.weight, 0) / wsum);
  return { overall, grade: gradeFor(overall), label: labelFor(overall), formula: FORMULA, factors: factors.map((f) => ({ ...f, effectiveWeight: f.applicable ? Math.round((f.weight / wsum) * 100) / 100 : 0 })) };
}
