import { Download, ExternalLink, FileText, Printer, RefreshCw, Star, GitFork, Scale } from 'lucide-react';
import Badge from '@/components/ui/Badge.jsx';
import { compact, formatDate, timeAgo } from '@/utils/format.js';
import { reportUrl } from '@/services/api.js';

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={16} className="text-muted" aria-hidden="true" />
      <span className="font-semibold">{value}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

export default function RepoHeader({ result, id, onRefresh }) {
  const { repo, source, coverage } = result;
  const isGithub = source.type === 'github';
  return (
    <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">{isGithub ? repo.owner : 'Bundled demo project'}</p>
          <h1 className="break-words text-3xl font-semibold sm:text-4xl">{repo.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-mist">
            <RefreshCw size={15} aria-hidden="true" /> Analyse again
          </button>
          <a href={reportUrl(id, 'md')} download className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-mist">
            <FileText size={15} aria-hidden="true" /> Report (.md)
          </a>
          <a href={reportUrl(id, 'json')} download className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-mist">
            <Download size={15} aria-hidden="true" /> Data (.json)
          </a>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-mist">
            <Printer size={15} aria-hidden="true" /> Print / PDF
          </button>
          {isGithub && repo.htmlUrl && (
            <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-ink px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-900">
              GitHub <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {repo.description && <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted">{repo.description}</p>}

      {isGithub && (
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
          <Stat icon={Star} value={compact(repo.stars)} label="stars" />
          <Stat icon={GitFork} value={compact(repo.forks)} label="forks" />
          <Stat icon={Scale} value={repo.license ?? 'No licence'} label="" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {source.demo && <Badge tone="warn">Demo project with deliberate problems</Badge>}
        {repo.archived && <Badge tone="bad">Archived</Badge>}
        {repo.createdAt && <Badge>Created {formatDate(repo.createdAt)}</Badge>}
        {repo.pushedAt && <Badge>Last push {timeAgo(repo.pushedAt)}</Badge>}
        <Badge>{coverage.filesAnalysed} files analysed</Badge>
        {(repo.topics ?? []).slice(0, 4).map((t) => <Badge key={t} tone="brand">{t}</Badge>)}
      </div>
    </section>
  );
}
