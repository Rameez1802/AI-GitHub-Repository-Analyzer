import { site } from '@/config/site.js';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          {site.name} is a capstone project at the School of Computer Science &amp; Engineering, Galgotias University.
        </p>
        <p>Findings are pattern-based and scores are indicative, not definitive.</p>
      </div>
    </footer>
  );
}
