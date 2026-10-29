import { Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { site } from '@/config/site.js';

/** Shows an ApiError: what happened, how to resolve it, and (for server bugs) where in the code. */
export default function ErrorState({ error, onRetry }) {
  const unreachable = error?.code === 'SERVER_UNREACHABLE';
  return (
    <div role="alert" className="mx-auto max-w-2xl rounded-3xl border border-line bg-white p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-removed/10 text-removed">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted">{error?.code ?? 'ERROR'}</p>
          <h2 className="mt-0.5 text-xl font-semibold">{error?.message ?? 'The analysis could not finish'}</h2>
        </div>
      </div>

      {error?.hint && (
        <div className="mt-5 rounded-2xl bg-mist p-4">
          <h3 className="text-sm font-semibold">How to resolve it</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">{error.hint}</p>
        </div>
      )}

      {unreachable && (
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>Open a terminal in the project folder.</li>
          <li>Run <code className="rounded bg-mist px-1.5 py-0.5 text-ink">npm install</code> once, then <code className="rounded bg-mist px-1.5 py-0.5 text-ink">npm run dev</code>.</li>
          <li>Wait for the line “RepoLens server http://localhost:8787”, then press “Try again”.</li>
        </ol>
      )}

      {error?.location && (
        <div className="mt-4 rounded-2xl border border-dashed border-line p-4">
          <h3 className="text-sm font-semibold">Where in the code (server)</h3>
          <p className="mt-1 break-all font-mono text-sm text-ink">{error.location.text}</p>
          <p className="mt-1 text-xs text-muted">Open that file at that line. If the cause is not obvious, copy this line and the message above into a bug report.</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onRetry} type="button" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-900">
          Try again
        </button>
        {!unreachable && (
          <Link to={site.demoPath} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-mist">
            Open demo analysis
          </Link>
        )}
        <Link to="/" className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium hover:bg-mist">
          Try another repository
        </Link>
      </div>
    </div>
  );
}
