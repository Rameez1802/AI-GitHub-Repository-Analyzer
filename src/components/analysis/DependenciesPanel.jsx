import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { SEVERITY } from '@/components/ui/severity.js';

export default function DependenciesPanel({ result }) {
  const { ecosystems, vulnerabilities: v } = result.dependencies;
  const statusTone = v.status === 'checked' ? (v.items.length ? 'bad' : 'good') : 'warn';
  const statusText = v.status === 'checked' ? (v.items.length ? `${v.items.length} advisories` : 'No known vulnerabilities') : v.status === 'failed' ? 'Check failed' : 'Not checked';
  return (
    <Card title="Dependencies" aside={<Badge tone={statusTone}>{statusText}</Badge>} className="h-full">
      {ecosystems.length === 0 ? (
        <p className="text-sm text-muted">No dependency manifest (package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, pom.xml) was found.</p>
      ) : (
        <ul className="space-y-4">
          {ecosystems.map((e) => (
            <li key={e.manifest} className="text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="font-medium">{e.manifest}</code>
                <span className="flex gap-1.5"><Badge>{e.deps.length} dependencies</Badge><Badge tone={e.lockfile ? 'good' : 'warn'}>{e.lockfile ? `Lock file: ${e.lockfile.split('/').pop()}` : 'No lock file'}</Badge></span>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {e.deps.slice(0, 14).map((d) => (
                  <li key={`${d.name}-${d.line}`} className={`rounded-full px-2.5 py-0.5 text-xs ${d.unpinned ? 'bg-changed/15 text-changed' : 'bg-mist text-muted'}`} title={d.unpinned ? 'Version is not pinned' : undefined}>
                    {d.name}{d.spec ? ` ${d.spec}` : ''}
                  </li>
                ))}
                {e.deps.length > 14 && <li className="px-1 text-xs text-muted">+{e.deps.length - 14} more</li>}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-2 text-sm font-semibold">Known vulnerabilities (OSV.dev)</h3>
        {v.status !== 'checked' && <p className="text-sm text-muted">Not checked{v.reason ? `: ${v.reason}` : ''}. See the notices above for how to resolve it.</p>}
        {v.status === 'checked' && v.items.length === 0 && <p className="text-sm text-muted">{v.checked} pinned dependencies were checked and none has a published advisory.</p>}
        {v.items.length > 0 && (
          <ul className="space-y-3">
            {v.items.map((i) => (
              <li key={`${i.package}-${i.id}`} className="rounded-2xl border border-line p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${(SEVERITY[i.severity] ?? SEVERITY.medium).chip}`}>{i.severity}</span>
                  <code className="font-medium">{i.package}@{i.version}</code>
                  <a href={i.url} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{i.id}</a>
                  <span className="text-xs text-muted">{i.manifest}:{i.line}</span>
                </p>
                <p className="mt-1 text-muted">{i.summary}</p>
                <p className="mt-1">{i.fixedIn ? <>Fix: upgrade to <strong>{i.fixedIn}</strong> or later.</> : 'No fixed version is listed. Check the advisory.'}{i.approximate && <span className="text-muted"> Version taken from a range; verify it.</span>}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
