import RepoForm from '@/components/home/RepoForm.jsx';
import HeroGrid from '@/components/home/HeroGrid.jsx';
import ServerStatus from '@/components/home/ServerStatus.jsx';
import { site } from '@/config/site.js';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-12 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-24">
        <div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">{site.tagline}</h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Paste a public repository. RepoLens reads its code, history and dependencies, reports every problem with its file and line and how to fix it, and answers your questions with evidence.
          </p>
          <div className="mt-8">
            <RepoForm />
            <ServerStatus />
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-white p-5 sm:p-6">
          <HeroGrid />
          <p className="mt-4 text-sm text-muted">A year of commits, one square per day. Every analysis starts here.</p>
        </div>
      </div>
    </section>
  );
}
