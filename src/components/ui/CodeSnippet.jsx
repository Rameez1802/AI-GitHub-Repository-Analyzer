export default function CodeSnippet({ lines }) {
  if (!lines?.length) return null;
  return (
    <pre className="overflow-x-auto rounded-2xl bg-ink p-4 text-[13px] leading-6 text-white/90" aria-label="Code excerpt">
      {lines.map((l) => (
        <div key={l.n} className={l.hit ? '-mx-4 bg-removed/25 px-4' : ''}>
          <span className="mr-4 inline-block w-8 select-none text-right text-white/40">{l.n}</span>
          <span className="whitespace-pre font-mono">{l.text || ' '}</span>
        </div>
      ))}
    </pre>
  );
}
