import Card from '@/components/ui/Card.jsx';
import CopyButton from '@/components/ui/CopyButton.jsx';

export default function HotspotsPanel({ result }) {
  const { hotspots, complexFunctions } = result;
  const max = Math.max(1, ...hotspots.map((h) => h.maxComplexity));
  return (
    <Card title="Hotspots: where to refactor first" className="h-full">
      {hotspots.length === 0 ? (
        <p className="text-sm text-muted">No file combines high complexity with large size. Nothing needs urgent refactoring.</p>
      ) : (
        <ul className="space-y-4">
          {hotspots.map((h) => (
            <li key={h.file}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <code className="min-w-0 truncate font-medium" title={h.file}>{h.file}</code>
                <span className="shrink-0 tabular-nums text-muted">{h.loc} lines</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist" aria-hidden="true">
                <div className={`h-full rounded-full ${h.maxComplexity > 25 ? 'bg-removed' : h.maxComplexity > 15 ? 'bg-changed' : 'bg-brand-500'}`} style={{ width: `${(h.maxComplexity / max) * 100}%` }} />
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
                Most complex: {h.topFunction.name}() at line {h.topFunction.line}, complexity {h.topFunction.complexity}, {h.topFunction.length} lines
                <CopyButton text={`${h.file}:${h.topFunction.line}`} label="Copy location" />
              </p>
            </li>
          ))}
        </ul>
      )}
      {complexFunctions.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="mb-2 text-sm font-semibold">Most complex functions</h3>
          <ol className="space-y-1.5 text-sm">
            {complexFunctions.slice(0, 5).map((f) => (
              <li key={`${f.file}:${f.line}`} className="flex justify-between gap-3">
                <span className="min-w-0 truncate"><code>{f.name}()</code> <span className="text-muted">{f.file}:{f.line}</span></span>
                <span className="font-semibold tabular-nums">{f.complexity}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}
