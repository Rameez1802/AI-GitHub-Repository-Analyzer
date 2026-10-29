import { Check, X } from 'lucide-react';
import Card from '@/components/ui/Card.jsx';

function Row({ ok, label, detail }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${ok ? 'bg-added/15 text-added' : 'bg-removed/10 text-removed'}`}>{ok ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}</span>
      <span><span className="sr-only">{ok ? 'Present: ' : 'Missing: '}</span>{label}{detail && <span className="text-muted"> {detail}</span>}</span>
    </li>
  );
}

export default function ProjectPanel({ result }) {
  const { docs, testing } = result;
  const secs = docs.readme.sections;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card title="Documentation">
        <ul className="space-y-2.5">
          <Row ok={docs.readme.exists} label="README" detail={docs.readme.exists ? `(${docs.readme.bytes.toLocaleString('en')} characters)` : ''} />
          <Row ok={secs.install} label="README has an installation section" />
          <Row ok={secs.usage} label="README has a usage section" />
          <Row ok={Boolean(docs.license.file)} label="Licence file" detail={docs.license.detected ? `(${docs.license.detected})` : ''} />
          <Row ok={docs.contributing} label="Contributing guide" />
          <Row ok={docs.changelog} label="Changelog" />
          <Row ok={docs.codeOfConduct} label="Code of conduct" />
          <Row ok={docs.docsFolder} label="docs/ folder" />
        </ul>
      </Card>
      <Card title="Testing and CI">
        <ul className="space-y-2.5">
          <Row ok={testing.testFiles > 0} label={`${testing.testFiles} test files`} detail={`for ${testing.sourceFiles} source files (ratio ${testing.ratio})`} />
          <Row ok={testing.frameworks.length > 0 || testing.hasTestScript} label="Test tooling" detail={testing.frameworks.join(', ') || (testing.hasTestScript ? 'npm test script' : 'none detected')} />
          <Row ok={testing.ci.present} label="Continuous integration" detail={testing.ci.present ? `(${testing.ci.provider})` : ''} />
        </ul>
        {testing.exampleTests.length > 0 && <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Examples: {testing.exampleTests.join(', ')}</p>}
      </Card>
    </div>
  );
}
