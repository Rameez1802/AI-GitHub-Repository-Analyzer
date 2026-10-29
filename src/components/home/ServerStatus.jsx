import { useEffect, useState } from 'react';
import { getHealth } from '@/services/api.js';

/** Tells the user, before they start, whether the server is reachable and what it can do. */
export default function ServerStatus() {
  const [state, setState] = useState({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;
    getHealth().then((health) => !cancelled && setState({ status: 'online', health })).catch((error) => !cancelled && setState({ status: 'offline', error }));
    return () => { cancelled = true; };
  }, []);

  if (state.status === 'checking') return null;
  if (state.status === 'offline') {
    return (
      <div role="alert" className="mt-5 max-w-xl rounded-2xl border border-removed/30 bg-removed/5 p-4 text-sm">
        <p className="font-semibold text-removed">{state.error.code}: {state.error.message}</p>
        <p className="mt-1 text-muted"><span className="font-medium text-ink">How to resolve: </span>{state.error.hint}</p>
      </div>
    );
  }
  const { health } = state;
  const pill = (ok, text) => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? 'bg-added/10 text-added' : 'bg-changed/10 text-changed'}`}><span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-added' : 'bg-changed'}`} aria-hidden="true" />{text}</span>;
  return (
    <div className="mt-5 flex max-w-xl flex-wrap gap-2" aria-label="Server status">
      {pill(true, 'Server online')}
      {pill(health.github.tokenConfigured, health.github.tokenConfigured ? 'GitHub token set' : 'No GitHub token: 60 requests per hour')}
      {pill(health.llm.configured, health.llm.configured ? `Model: ${health.llm.model}` : 'No language model: extractive answers')}
    </div>
  );
}
