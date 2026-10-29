import { Download, Gauge, MessageSquare } from 'lucide-react';

const steps = [
  {
    icon: Download,
    title: 'Read the repository',
    text: 'RepoLens downloads the file tree and source files, and reads commits, contributors and pull requests through the GitHub API.',
  },
  {
    icon: Gauge,
    title: 'Find the problems',
    text: 'Static analysis measures complexity and duplication and flags risky patterns. Each finding shows its file, line, a fix and the cost of ignoring it.',
  },
  {
    icon: MessageSquare,
    title: 'Get a health report',
    text: 'Five factors combine into one score you can audit. Ask questions, then export the full report as Markdown, JSON or PDF.',
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-5 py-12">
      <h2 id="how-title" className="max-w-md text-3xl font-semibold sm:text-4xl">
        From a link to an answer in three steps
      </h2>
      <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="bg-white p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-muted">Step {i + 1}</span>
            </div>
            <h3 className="mt-5 text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
