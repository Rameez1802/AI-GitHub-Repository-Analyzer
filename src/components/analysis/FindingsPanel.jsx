import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Card from '@/components/ui/Card.jsx';
import CodeSnippet from '@/components/ui/CodeSnippet.jsx';
import CopyButton from '@/components/ui/CopyButton.jsx';
import { SEVERITY, SEVERITY_ORDER, loc } from '@/components/ui/severity.js';

const PAGE = 12;

function Finding({ f }) {
  const sev = SEVERITY[f.severity];
  return (
    <li className="rounded-2xl border border-line">
      <details open={f.severity === 'critical' || f.severity === 'high'} className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 p-4">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${sev.chip}`}>{sev.label}</span>
          <span className="font-medium">{f.title}</span>
          <span className="rounded bg-mist px-1.5 py-0.5 font-mono text-xs text-muted">{f.rule}</span>
          <span className="ml-auto flex items-center gap-1">
            <code className="break-all text-xs text-muted">{loc(f)}</code>
            <CopyButton text={loc(f)} label="Copy location" />
            <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <div className="space-y-4 border-t border-line p-4">
          <p className="text-sm">{f.message}</p>
          <CodeSnippet lines={f.snippet} />
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-xl bg-mist p-3"><dt className="font-semibold">Why it matters</dt><dd className="mt-1 text-muted">{f.why}</dd></div>
            <div className="rounded-xl bg-added/10 p-3"><dt className="font-semibold text-added">How to fix it</dt><dd className="mt-1">{f.fix}</dd></div>
            <div className="rounded-xl bg-removed/5 p-3"><dt className="font-semibold text-removed">If you ignore it</dt><dd className="mt-1 text-muted">{f.ifIgnored}</dd></div>
          </dl>
          {f.confidence !== 'high' && <p className="text-xs text-muted">Confidence: {f.confidence}. This is a pattern match, so confirm it is a real problem before changing code.</p>}
        </div>
      </details>
    </li>
  );
}

export default function FindingsPanel({ result }) {
  const { findings, findingCounts } = result;
  const [severity, setSeverity] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);

  const categories = useMemo(() => Object.keys(findingCounts.byCategory), [findingCounts]);
  const list = useMemo(() => findings.filter((f) => (severity === 'all' || f.severity === severity) && (category === 'all' || f.category === category) && (!query || `${f.title} ${f.file} ${f.message} ${f.rule}`.toLowerCase().includes(query.toLowerCase()))), [findings, severity, category, query]);

  const chip = (active) => `rounded-full border px-3 py-1 text-sm ${active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line bg-white hover:bg-mist'}`;

  return (
    <Card title={`Findings (${findingCounts.total})`} aside={<span className="text-sm text-muted">Every finding shows file and line, why it matters, how to fix it and what happens if you do not</span>}>
      {findingCounts.total === 0 ? (
        <p className="text-sm text-muted">No findings. The rules found nothing to report in the analysed files.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button type="button" className={chip(severity === 'all')} onClick={() => { setSeverity('all'); setShown(PAGE); }}>All {findingCounts.total}</button>
            {SEVERITY_ORDER.filter((s) => findingCounts.bySeverity[s]).map((s) => (
              <button key={s} type="button" className={chip(severity === s)} onClick={() => { setSeverity(s); setShown(PAGE); }}>{SEVERITY[s].label} {findingCounts.bySeverity[s]}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <label className="sr-only" htmlFor="finding-category">Category</label>
            <select id="finding-category" value={category} onChange={(e) => { setCategory(e.target.value); setShown(PAGE); }} className="h-10 rounded-xl border border-line bg-white px-3 text-sm">
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c} ({findingCounts.byCategory[c]})</option>)}
            </select>
            <label className="sr-only" htmlFor="finding-search">Search findings</label>
            <input id="finding-search" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE); }} placeholder="Search by file, rule or text" className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-brand-400" />
          </div>

          <ul className="mt-4 space-y-3">
            {list.slice(0, shown).map((f) => <Finding key={f.id} f={f} />)}
          </ul>
          {list.length === 0 && <p className="mt-4 text-sm text-muted">No findings match these filters.</p>}
          {list.length > shown && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-mist print:hidden">
              Show {Math.min(PAGE, list.length - shown)} more ({list.length - shown} left)
            </button>
          )}
        </>
      )}
    </Card>
  );
}
