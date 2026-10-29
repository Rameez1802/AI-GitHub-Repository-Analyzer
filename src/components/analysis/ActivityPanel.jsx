import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';

const RAMP = ['#eef1f6', '#c2c8ff', '#9aa2ff', '#6c72fb', '#3b3ee0'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const level = (c, max) => (c === 0 ? 0 : c / Math.max(1, max) > 0.75 ? 4 : c / Math.max(1, max) > 0.5 ? 3 : c / Math.max(1, max) > 0.25 ? 2 : 1);

function Heatmap({ heatmap }) {
  const labels = [];
  let last = -1;
  heatmap.weeks.forEach((w, i) => {
    const m = new Date(w.week * 1000).getMonth();
    if (m !== last) { labels.push({ col: i + 1, text: new Date(w.week * 1000).toLocaleDateString('en', { month: 'short' }) }); last = m; }
  });
  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[640px]" role="img" aria-label={`${heatmap.total} commits in the last year, active in ${heatmap.activeWeeks} of ${heatmap.weeks.length} weeks`}>
        <div className="mb-1.5 grid text-xs text-muted" style={{ gridTemplateColumns: `repeat(${heatmap.weeks.length}, minmax(0, 1fr))` }}>
          {labels.map((l) => <span key={`${l.col}-${l.text}`} style={{ gridColumnStart: l.col }} className="whitespace-nowrap">{l.text}</span>)}
        </div>
        <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))', gridTemplateColumns: `repeat(${heatmap.weeks.length}, minmax(0, 1fr))` }}>
          {heatmap.weeks.flatMap((w) => w.days.map((count, d) => (
            <span key={`${w.week}-${d}`} title={`${count} ${count === 1 ? 'commit' : 'commits'} on ${DAYS[d]}, ${new Date((w.week + d * 86400) * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`} className="aspect-square rounded-[3px]" style={{ background: RAMP[level(count, heatmap.max)] }} />
          )))}
        </div>
      </div>
    </div>
  );
}

function Avatar({ person }) {
  return person.avatar_url
    ? <img src={`${person.avatar_url}${person.avatar_url.includes('?') ? '&' : '?'}s=64`} alt="" loading="lazy" className="h-8 w-8 rounded-full bg-mist" />
    : <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800" aria-hidden="true">{person.login.slice(0, 2).toUpperCase()}</span>;
}

export default function ActivityPanel({ activity }) {
  if (!activity.available) {
    return (
      <Card title="Repository activity">
        <p className="text-sm text-muted">Not available: {activity.reason}. The maintenance factor is left out of the score and the other weights are rescaled.</p>
      </Card>
    );
  }
  const { heatmap, contributors, pulls } = activity;
  const risky = contributors.busFactor > 0 && contributors.busFactor <= 2;
  const topCount = contributors.top[0]?.contributions ?? 1;
  return (
    <div className="space-y-5">
      <Card title="Commit activity, last 52 weeks" aside={<div className="flex items-center gap-1.5 text-xs text-muted" aria-hidden="true">Less {RAMP.map((c) => <span key={c} className="h-3 w-3 rounded-[3px]" style={{ background: c }} />)} More</div>}>
        {heatmap.available ? (
          <>
            <Heatmap heatmap={heatmap} />
            <dl className="mt-4 grid grid-cols-3 gap-4 border-t border-line pt-4 text-sm">
              <div><dt className="text-muted">Commits in a year</dt><dd className="font-display text-2xl font-semibold">{heatmap.total.toLocaleString('en')}</dd></div>
              <div><dt className="text-muted">Weeks with commits</dt><dd className="font-display text-2xl font-semibold">{heatmap.activeWeeks} of {heatmap.weeks.length}</dd></div>
              <div><dt className="text-muted">Median PR merge time</dt><dd className="font-display text-2xl font-semibold">{pulls.medianMergeHours === null ? 'n/a' : pulls.medianMergeHours < 48 ? `${Math.round(pulls.medianMergeHours)} h` : `${Math.round(pulls.medianMergeHours / 24)} d`}</dd></div>
            </dl>
          </>
        ) : <p className="text-sm text-muted">{activity.reason ?? 'Weekly commit statistics are not ready yet.'} Use “Analyse again” in a minute.</p>}
      </Card>
      <Card title="Contributors" aside={<Badge tone={risky ? 'bad' : 'good'}>Bus factor {contributors.busFactor}</Badge>}>
        <p className={`rounded-2xl p-4 text-sm leading-relaxed ${risky ? 'bg-removed/10' : 'bg-added/10'}`}>
          {contributors.busFactor === 1 ? 'One person wrote' : `${contributors.busFactor} people wrote`} at least half of the {contributors.total.toLocaleString('en')} commits.{' '}
          {risky ? 'If they stopped, the project would stall.' : 'Knowledge is spread across the team.'}
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {contributors.top.map((p) => (
            <li key={p.login} className="flex items-center gap-3">
              <Avatar person={p} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm"><span className="truncate font-medium">{p.login}</span><span className="tabular-nums text-muted">{p.contributions.toLocaleString('en')}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(p.contributions / topCount) * 100}%` }} /></div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
