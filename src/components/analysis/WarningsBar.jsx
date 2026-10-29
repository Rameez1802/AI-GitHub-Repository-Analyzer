import { Info } from 'lucide-react';

export default function WarningsBar({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <section aria-label="Notices" className="rounded-3xl border border-changed/30 bg-changed/5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Info size={16} className="text-changed" aria-hidden="true" /> {warnings.length} notice{warnings.length === 1 ? '' : 's'} about this analysis
      </h2>
      <ul className="mt-3 space-y-3">
        {warnings.map((w, i) => (
          <li key={`${w.code}-${i}`} className="text-sm">
            <p><span className="mr-2 rounded bg-white px-1.5 py-0.5 font-mono text-xs text-muted">{w.code}</span>{w.message}</p>
            {w.hint && <p className="mt-1 text-muted"><span className="font-medium text-ink">How to resolve: </span>{w.hint}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
