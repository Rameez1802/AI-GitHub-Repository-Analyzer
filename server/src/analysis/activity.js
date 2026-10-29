const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Turns raw GitHub data into the activity section. Missing pieces are reported, never invented. */
export function summariseActivity({ commitActivity, contributors, pulls, repo, unavailableReason }) {
  if (!repo) return { available: false, reason: unavailableReason ?? 'No repository history for this source.' };

  const weeks = Array.isArray(commitActivity) ? commitActivity : [];
  const heat = {
    weeks, total: weeks.reduce((s, w) => s + w.total, 0), activeWeeks: weeks.filter((w) => w.total > 0).length,
    recentActiveWeeks: weeks.slice(-12).filter((w) => w.total > 0).length, recentWeekCount: Math.min(12, weeks.length),
    max: Math.max(0, ...weeks.flatMap((w) => w.days)), available: weeks.length > 0,
  };
  heat.busiest = weeks.reduce((best, w) => (!best || w.total > best.total ? w : best), null);

  const sorted = [...(contributors ?? [])].sort((a, b) => b.contributions - a.contributions);
  const total = sorted.reduce((s, c) => s + c.contributions, 0);
  let run = 0, busFactor = 0;
  for (const c of sorted) { run += c.contributions; busFactor++; if (run >= total * 0.5) break; }

  const merged = (pulls ?? []).filter((p) => p.merged_at);
  const hours = merged.map((p) => (new Date(p.merged_at) - new Date(p.created_at)) / 3_600_000);
  const daysSincePush = repo.pushed_at ? (Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000 : null;

  return {
    available: true, daysSincePush, heatmap: heat,
    contributors: { count: sorted.length, total, busFactor: total ? busFactor : 0, topShare: total ? (sorted[0]?.contributions ?? 0) / total : 0, top: sorted.slice(0, 8).map((c) => ({ login: c.login, avatar_url: c.avatar_url, contributions: c.contributions, share: total ? c.contributions / total : 0, html_url: c.html_url })) },
    pulls: { sampled: (pulls ?? []).length, merged: merged.length, medianMergeHours: median(hours) },
    reason: heat.available ? null : 'GitHub has not finished computing weekly commit statistics.',
  };
}
