import { useCallback, useEffect, useState } from 'react';
import { ApiError, getAnalysis, startAnalysis } from '@/services/api.js';

const toError = (e) => (e instanceof ApiError ? e : new ApiError({ code: 'CLIENT_ERROR', message: e?.message ?? 'Unexpected error', hint: 'Open the browser console (F12) for details.' }));

/** Starts an analysis on the server and polls until it is done or failed. */
export function useAnalysis(input) {
  const [state, setState] = useState({ status: 'starting', id: null, progress: { percent: 0, label: 'Starting', stage: 'queued' }, result: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer;
    setState({ status: 'starting', id: null, progress: { percent: 0, label: 'Starting', stage: 'queued' }, result: null, error: null });

    (async () => {
      try {
        const { id } = await startAnalysis(input, { fresh: attempt > 0 });
        const poll = async () => {
          try {
            const job = await getAnalysis(id);
            if (cancelled) return;
            if (job.status === 'done') setState({ status: 'ready', id, progress: { percent: 100, label: 'Done', stage: 'done' }, result: job.result, error: null });
            else if (job.status === 'error') setState({ status: 'error', id, progress: { percent: 0, label: '', stage: 'error' }, result: null, error: new ApiError(job.error) });
            else {
              setState((s) => ({ ...s, status: 'running', id, progress: { percent: job.percent, label: job.label, stage: job.stage } }));
              timer = setTimeout(poll, 800);
            }
          } catch (e) {
            if (!cancelled) setState({ status: 'error', id, progress: { percent: 0, label: '', stage: 'error' }, result: null, error: toError(e) });
          }
        };
        poll();
      } catch (e) {
        if (!cancelled) setState({ status: 'error', id: null, progress: { percent: 0, label: '', stage: 'error' }, result: null, error: toError(e) });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
