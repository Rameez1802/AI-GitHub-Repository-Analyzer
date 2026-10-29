import Card from '@/components/ui/Card.jsx';
import { Check } from 'lucide-react';

const STEPS = [
  ['meta', 'Reading repository details'],
  ['tree', 'Listing files'],
  ['files', 'Downloading source files'],
  ['analysis', 'Analysing code'],
  ['dependencies', 'Checking dependencies'],
  ['architecture', 'Mapping modules and imports'],
  ['activity', 'Reading commit history'],
  ['score', 'Calculating the health score'],
  ['summary', 'Writing the summary'],
];
const order = STEPS.map(([id]) => id);

export default function ProgressView({ progress, slug }) {
  const current = Math.max(0, order.indexOf(progress.stage === 'index' ? 'score' : progress.stage));
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-2xl">
      <Card>
        <h1 className="text-2xl font-semibold">Analysing {slug}</h1>
        <p className="mt-1 text-sm text-muted">{progress.label || 'Starting'}. Large repositories can take up to a minute.</p>
        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-500" style={{ width: `${Math.max(4, progress.percent)}%` }} />
        </div>
        <ol className="mt-6 space-y-2.5">
          {STEPS.map(([id, label], i) => {
            const state = i < current ? 'done' : i === current ? 'active' : 'todo';
            return (
              <li key={id} className={`flex items-center gap-3 text-sm ${state === 'todo' ? 'text-muted/70' : 'text-ink'}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full ${state === 'done' ? 'bg-added text-white' : state === 'active' ? 'border-2 border-brand-600' : 'border border-line'}`}>
                  {state === 'done' && <Check size={12} aria-hidden="true" />}
                </span>
                <span className={state === 'active' ? 'font-medium' : ''}>{label}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
