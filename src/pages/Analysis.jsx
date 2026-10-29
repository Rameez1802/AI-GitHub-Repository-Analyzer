import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAnalysis } from '@/hooks/useAnalysis.js';
import ProgressView from '@/components/analysis/ProgressView.jsx';
import ErrorState from '@/components/ui/ErrorState.jsx';
import RepoHeader from '@/components/analysis/RepoHeader.jsx';
import WarningsBar from '@/components/analysis/WarningsBar.jsx';
import ScoreOverview from '@/components/analysis/ScoreOverview.jsx';
import SummaryPanel from '@/components/analysis/SummaryPanel.jsx';
import LanguageBar from '@/components/analysis/LanguageBar.jsx';
import FindingsPanel from '@/components/analysis/FindingsPanel.jsx';
import HotspotsPanel from '@/components/analysis/HotspotsPanel.jsx';
import ArchitecturePanel from '@/components/analysis/ArchitecturePanel.jsx';
import DependenciesPanel from '@/components/analysis/DependenciesPanel.jsx';
import ProjectPanel from '@/components/analysis/ProjectPanel.jsx';
import ActivityPanel from '@/components/analysis/ActivityPanel.jsx';
import AskPanel from '@/components/analysis/AskPanel.jsx';
import { site } from '@/config/site.js';

export default function Analysis() {
  const { owner, repo } = useParams();
  const input = owner === 'demo' ? 'demo' : `${owner}/${repo}`;
  const { status, id, progress, result, error, retry } = useAnalysis(input);

  useEffect(() => {
    document.title = `${input === 'demo' ? 'Demo' : input} · ${site.name}`;
    return () => {
      document.title = `${site.name}: understand any GitHub repository`;
    };
  }, [input]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
      {(status === 'starting' || status === 'running') && <ProgressView progress={progress} slug={input === 'demo' ? 'the demo project' : input} />}
      {status === 'error' && <div className="py-8"><ErrorState error={error} onRetry={retry} /></div>}
      {status === 'ready' && (
        <div className="space-y-5">
          <RepoHeader result={result} id={id} onRefresh={retry} />
          <WarningsBar warnings={result.warnings} />
          <ScoreOverview result={result} />
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7"><SummaryPanel summary={result.summary} /></div>
            <div className="lg:col-span-5"><LanguageBar result={result} /></div>
          </div>
          <FindingsPanel result={result} />
          <div className="grid gap-5 lg:grid-cols-2">
            <HotspotsPanel result={result} />
            <DependenciesPanel result={result} />
          </div>
          <ArchitecturePanel result={result} />
          <ProjectPanel result={result} />
          <ActivityPanel activity={result.activity} />
          <AskPanel id={id} name={result.repo.name} />
        </div>
      )}
    </div>
  );
}
