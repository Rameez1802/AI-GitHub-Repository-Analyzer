import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { ApiError, askQuestion } from '@/services/api.js';

const SUGGESTED = [
  'Are there any secrets or security problems?',
  'Which files are the most complex?',
  'Is this repository actively maintained?',
  'How is the code organised?',
  'Does it have tests and CI?',
];

export default function AskPanel({ id, name }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function ask(text) {
    const q = text.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setDraft('');
    setBusy(true);
    try {
      const a = await askQuestion(id, q);
      setMessages((m) => [...m, { role: 'assistant', ...a }]);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError({ message: e.message });
      setMessages((m) => [...m, { role: 'error', code: err.code, text: err.message, hint: err.hint }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`Ask about ${name}`} aside={<span className="text-sm text-muted print:hidden">Answers show their evidence</span>}>
      <div ref={listRef} aria-live="polite" className="max-h-[28rem] min-h-32 space-y-4 overflow-y-auto rounded-2xl bg-mist p-4 print:hidden">
        {messages.length === 0 && <p className="text-sm text-muted">Pick a question or write your own. Without a language model, answers come from computed facts and keyword search over the code, and say so.</p>}
        {messages.map((m, i) => {
          if (m.role === 'user') return <div key={i} className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white">{m.text}</p></div>;
          if (m.role === 'error') return <div key={i} role="alert" className="max-w-[90%] rounded-2xl bg-removed/10 p-3 text-sm"><p className="font-medium text-removed">{m.code}: {m.text}</p>{m.hint && <p className="mt-1 text-muted">{m.hint}</p>}</div>;
          return (
            <div key={i} className="max-w-[92%]">
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed">
                <p className="mb-1.5 flex gap-1.5"><Badge tone={m.mode === 'llm' ? 'good' : 'neutral'}>{m.mode === 'llm' ? `Model: ${m.model}` : 'From computed facts'}</Badge></p>
                <p className="whitespace-pre-wrap">{m.answer}</p>
                {m.note && <p className="mt-2 text-xs text-muted">{m.note}</p>}
                {m.unverifiedCitations?.length > 0 && <p className="mt-2 rounded-lg bg-changed/10 p-2 text-xs text-changed">Not verified (no such file or line in the analysed code): {m.unverifiedCitations.join(', ')}</p>}
              </div>
              {m.citations?.length > 0 && <p className="mt-1.5 flex flex-wrap gap-1.5 px-1 text-xs text-muted">Verified citations: {m.citations.map((c) => <code key={`${c.file}${c.startLine}`} className="rounded-full bg-white px-2 py-0.5">{c.file}:{c.startLine}-{c.endLine}</code>)}</p>}
              {m.evidence?.length > 0 && (
                <details className="mt-1.5 px-1 text-xs text-muted">
                  <summary className="cursor-pointer">Evidence searched ({m.evidence.length} passages)</summary>
                  <ul className="mt-2 space-y-2">
                    {m.evidence.map((e) => <li key={`${e.file}${e.startLine}`}><code className="font-medium text-ink">{e.file}:{e.startLine}-{e.endLine}</code><pre className="mt-1 overflow-x-auto rounded-lg bg-white p-2 font-mono">{e.excerpt}</pre></li>)}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
        {busy && <p className="text-sm text-muted">Searching the repository…</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {SUGGESTED.map((q) => <button key={q} type="button" onClick={() => ask(q)} disabled={busy} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50">{q}</button>)}
      </div>
      <form className="mt-3 flex gap-2 print:hidden" onSubmit={(e) => { e.preventDefault(); ask(draft); }}>
        <label htmlFor="ask-input" className="sr-only">Your question</label>
        <input id="ask-input" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder="Ask about the code, for example “where is login handled?”" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-sm outline-none focus:border-brand-400" />
        <button type="submit" disabled={busy || !draft.trim()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"><Send size={15} aria-hidden="true" /> Send</button>
      </form>
    </Card>
  );
}
