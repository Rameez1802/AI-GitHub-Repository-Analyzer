import Card from '@/components/ui/Card.jsx';

const COLORS = ['#3b3ee0', '#1f9d6b', '#c9811a', '#e2475b', '#0e8fa3', '#8b5cf6', '#94a3b8'];

export default function LanguageBar({ result }) {
  const langs = result.languages.slice(0, 7);
  return (
    <Card title="Languages (by lines of code)" className="h-full">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-mist" role="img" aria-label={`Languages: ${langs.map((l) => `${l.name} ${Math.round(l.percent)}%`).join(', ')}`}>
        {langs.map((l, i) => <span key={l.name} style={{ width: `${l.percent}%`, background: COLORS[i % COLORS.length] }} />)}
      </div>
      <ul className="mt-5 space-y-2.5">
        {langs.map((l, i) => (
          <li key={l.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-[4px]" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />
              {l.name}
              <span className="text-muted">{l.files} files</span>
            </span>
            <span className="font-medium tabular-nums">{l.loc.toLocaleString('en')} lines · {l.percent < 1 ? '<1' : Math.round(l.percent)}%</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div><dt className="text-muted">Functions measured</dt><dd className="font-display text-xl font-semibold">{result.metrics.functions}</dd></div>
        <div><dt className="text-muted">Average complexity</dt><dd className="font-display text-xl font-semibold">{result.metrics.avgComplexity}</dd></div>
        <div><dt className="text-muted">Duplicated code</dt><dd className="font-display text-xl font-semibold">{result.metrics.duplicationPercent}%</dd></div>
        <div><dt className="text-muted">Comment ratio</dt><dd className="font-display text-xl font-semibold">{Math.round(result.metrics.commentRatio * 100)}%</dd></div>
      </dl>
    </Card>
  );
}
