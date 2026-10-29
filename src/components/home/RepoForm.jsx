import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { parseRepoInput } from '@/utils/parseRepoInput.js';
import { site } from '@/config/site.js';

export default function RepoForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    const parsed = parseRepoInput(value);
    if (!parsed) {
      setError('Enter a repository as owner/name, or paste its GitHub link.');
      return;
    }
    setError('');
    navigate(`/analyse/${parsed.owner}/${parsed.repo}`);
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="repo-input" className="sr-only">
          GitHub repository
        </label>
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-[0_1px_0_rgba(14,26,43,0.04)] focus-within:border-brand-400 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 px-3">
            <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
            <input
              id="repo-input"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck="false"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError('');
              }}
              placeholder="facebook/react or a GitHub link"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'repo-error' : undefined}
              className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted/70"
            />
          </div>
          <button
            type="submit"
            className="h-12 rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Analyse repository
          </button>
        </div>
        {error && (
          <p id="repo-error" role="alert" className="mt-2 px-1 text-sm text-removed">
            {error}
          </p>
        )}
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Try</span>
        {site.sampleRepos.map((slug) => (
          <Link
            key={slug}
            to={`/analyse/${slug}`}
            className="rounded-full border border-line bg-white px-3 py-1 text-ink transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            {slug}
          </Link>
        ))}
        <Link to={site.demoPath} className="rounded-full px-3 py-1 font-medium text-brand-700 hover:bg-brand-50">
          or use demo data
        </Link>
      </div>
    </div>
  );
}
