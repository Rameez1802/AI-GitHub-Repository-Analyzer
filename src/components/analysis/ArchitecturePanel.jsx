import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';

const Chips = ({ items, empty = '-' }) => (items.length ? <span className="flex flex-wrap gap-1">{items.map((i) => <span key={i} className="rounded-full bg-mist px-2 py-0.5 text-xs">{i}</span>)}</span> : <span className="text-muted">{empty}</span>);

export default function ArchitecturePanel({ result }) {
  const a = result.architecture;
  return (
    <Card title="Architecture" aside={<Badge>{a.importStats.resolved} imports resolved</Badge>}>
      {a.cycles.length > 0 && (
        <div className="mb-4 rounded-2xl bg-changed/10 p-4 text-sm">
          <p className="font-semibold text-changed">Circular dependencies</p>
          <p className="mt-1 text-muted">These modules depend on each other, which makes them hard to change or test alone: {a.cycles.map((c) => c.join(' ↔ ')).join('; ')}.</p>
          <p className="mt-1"><span className="font-medium">How to fix: </span><span className="text-muted">move the shared code into a third module that both import.</span></p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-muted">
            <tr><th className="pb-2 pr-3 font-medium">Module</th><th className="pb-2 pr-3 font-medium">Files</th><th className="pb-2 pr-3 font-medium">Lines</th><th className="pb-2 pr-3 font-medium">Depends on</th><th className="pb-2 font-medium">Used by</th></tr>
          </thead>
          <tbody className="divide-y divide-line align-top">
            {a.modules.slice(0, 12).map((m) => (
              <tr key={m.name}>
                <td className="py-2.5 pr-3 font-medium"><code>{m.name}</code><div className="text-xs font-normal text-muted">{m.languages.join(', ')}</div></td>
                <td className="py-2.5 pr-3 tabular-nums">{m.files}</td>
                <td className="py-2.5 pr-3 tabular-nums">{m.loc.toLocaleString('en')}</td>
                <td className="py-2.5 pr-3"><Chips items={m.dependsOn} /></td>
                <td className="py-2.5"><Chips items={m.usedBy} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-5 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Likely entry points</h3>
          {a.entryPoints.length ? <ul className="space-y-1 text-sm">{a.entryPoints.map((e) => <li key={e.file}><code>{e.file}</code> <span className="text-muted">{e.reason}</span></li>)}</ul> : <p className="text-sm text-muted">None detected.</p>}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Most used external libraries</h3>
          {a.externalLibraries.length ? <Chips items={a.externalLibraries.map((l) => `${l.name} (${l.files})`)} /> : <p className="text-sm text-muted">None detected.</p>}
        </div>
      </div>
    </Card>
  );
}
