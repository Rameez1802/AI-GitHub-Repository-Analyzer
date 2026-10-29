import { Check, TriangleAlert } from 'lucide-react';
import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';

function Items({ items, icon: Icon, className, empty }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-2 text-sm text-muted">
          <Icon size={16} className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true" />
          <span>{s.text}{s.source && <span className="ml-1 rounded bg-mist px-1.5 py-0.5 font-mono text-xs">{s.source}</span>}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SummaryPanel({ summary }) {
  const llm = summary.mode === 'llm';
  return (
    <Card title="Summary" aside={<Badge tone={llm ? 'good' : 'neutral'}>{llm ? `Written by ${summary.model}` : 'Extractive (no language model)'}</Badge>}>
      <div className="space-y-3 text-[0.95rem] leading-relaxed">
        {summary.overview.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {summary.architecture.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-sm font-semibold">How the code is organised</h3>
          <div className="space-y-2 text-sm leading-relaxed text-muted">{summary.architecture.map((p, i) => <p key={i}>{p}</p>)}</div>
        </div>
      )}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Strengths</h3>
          <Items items={summary.strengths} icon={Check} className="text-added" empty="No factor scored 75 or above." />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Risks</h3>
          <Items items={summary.risks} icon={TriangleAlert} className="text-removed" empty="No factor scored below 50." />
        </div>
      </div>
      {llm && summary.unverifiedCitations?.length > 0 && (
        <p className="mt-4 rounded-xl bg-changed/10 p-3 text-xs text-changed">
          {summary.unverifiedCitations.length} citation(s) written by the model could not be matched to analysed files and were ignored: {summary.unverifiedCitations.join(', ')}.
        </p>
      )}
      <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">
        {llm ? 'The model was given only computed facts and retrieved code, and every file reference is checked against the files that were analysed.' : 'Built only from computed facts, with no model-written text. Configure a language model in .env for fuller summaries.'}
      </p>
    </Card>
  );
}
