const stages = [
  ['Data acquisition', 'Reads repository details, the file tree and up to 250 source files from GitHub.'],
  ['Static analysis', 'Splits each file into code and comments, finds functions, measures complexity, length and nesting, and applies security and quality rules.'],
  ['Repository mining', 'Reads weekly commits, contributors and pull-request merge times to judge how well the project is maintained.'],
  ['Dependency check', 'Reads manifests and looks pinned versions up in the OSV.dev vulnerability database.'],
  ['Retrieval', 'Splits code into overlapping chunks and ranks them for a question with BM25, so answers can cite file and line.'],
  ['Explanation', 'Writes the summary and answers. With a language model configured, the model sees only computed facts and retrieved code, and its citations are verified. Without one, text is extractive.'],
];

const limits = [
  'Static analysis uses a lightweight scanner, not a full compiler. Function boundaries and complexity are good estimates, and pattern-based findings can include false positives (each shows its confidence).',
  'At most 250 source files and 200 KB per file are analysed by default (adjustable in .env). Very large repositories are therefore sampled, and the coverage notice says so.',
  'Test and CI detection looks for conventional names; unusual layouts may be missed.',
  'Vulnerability checks use the version in the manifest. When it is a range, the version is approximate and marked so.',
  'Even with grounding, a language model can still be wrong. Citations are checked against analysed files, but a valid citation does not prove the statement is correct.',
  'The health score is a weighted summary of the factors shown, not a verdict on a project.',
];

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="max-w-2xl text-4xl font-semibold sm:text-5xl">How the analysis works</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">RepoLens combines static analysis and repository mining with retrieval, so that every explanation rests on evidence you can open.</p>

      <ol className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-2">
        {stages.map(([name, text], i) => (
          <li key={name} className="bg-white p-6 sm:p-7">
            <p className="text-sm font-medium text-muted">Stage {i + 1}</p>
            <h2 className="mt-1 text-xl font-semibold">{name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">The health score</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">S = 0.25·Q + 0.25·M + 0.15·D + 0.20·T + 0.15·R, where Q is code quality, M maintenance health, D documentation, T testing and CI, and R dependency and security risk (a higher score means lower risk). Each factor is scaled 0 to 100 and lists the exact evidence behind it. A factor that cannot be measured, for example maintenance for a project without Git history, is left out and the other weights are rescaled.</p>
      </div>

      <div className="mt-5 rounded-3xl border border-line bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Limits you should know</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">{limits.map((l) => <li key={l}>{l}</li>)}</ul>
      </div>
    </div>
  );
}
