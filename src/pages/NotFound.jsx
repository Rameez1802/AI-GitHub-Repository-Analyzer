import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-4xl font-semibold">This page doesn't exist</h1>
      <p className="mt-3 text-muted">Check the address, or go back and analyse a repository.</p>
      <Link to="/" className="mt-8 inline-block rounded-xl bg-ink px-5 py-3 text-sm font-medium text-white hover:bg-brand-900">
        Back to home
      </Link>
    </div>
  );
}
