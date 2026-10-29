import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { toneFor } from '@/components/ui/severity.js';

const R = 54;
const C = 2 * Math.PI * R;

function Ring({ score, grade }) {
  const [drawn, setDrawn] = useState(false);
  const tone = toneFor(score);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={`Health score ${score} out of 100, grade ${grade}`}>
        <circle cx="64" cy="64" r={R} fill="none" stroke="#e6eaf1" strokeWidth="12" />
        <circle className="ring-progress" cx="64" cy="64" r={R} fill="none" stroke={tone.hex} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={drawn ? C * (1 - score / 100) : C} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-5xl font-semibold leading-none">{score}</p>
          <p className="mt-1 text-sm text-muted">out of 100</p>
        </div>
      </div>
    </div>
  );
}

export default function ScoreOverview({ result }) {
  const { score } = result;
  const tone = toneFor(score.overall);
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <Card title="Health score" className="lg:col-span-4">
        <div className="flex flex-col items-center py-2">
          <Ring score={score.overall} grade={score.grade} />
          <p className={`mt-4 text-lg font-semibold ${tone.text}`}>Grade {score.grade}: {score.label}</p>
          <p className="mt-1 max-w-[16rem] text-center text-sm leading-relaxed text-muted">{result.findingCounts.total} findings across {result.coverage.filesAnalysed} analysed files.</p>
        </div>
      </Card>

      <Card title="What the score is made of" aside={<Badge>Each factor shows its evidence</Badge>} className="lg:col-span-8">
        <ul className="divide-y divide-line">
          {score.factors.map((f) => {
            const t = f.applicable ? toneFor(f.score) : null;
            return (
              <li key={f.id} className="py-3.5 first:pt-0">
                <details>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">
                        <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-md bg-brand-50 text-xs font-semibold text-brand-700">{f.letter}</span>
                        {f.label}
                        <span className="ml-2 text-sm font-normal text-muted">{f.applicable ? `weight ${Math.round(f.effectiveWeight * 100)}%` : 'not measured'}</span>
                      </p>
                      <p className={`font-display text-lg font-semibold ${t ? t.text : 'text-muted'}`}>{f.applicable ? f.score : 'n/a'}</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist" role="meter" aria-label={`${f.label} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.applicable ? f.score : 0}>
                      {f.applicable && <div className={`h-full rounded-full ${t.bg}`} style={{ width: `${f.score}%` }} />}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{f.detail}</p>
                  </summary>
                  {f.evidence.length > 0 && (
                    <ul className="mt-2 list-disc space-y-1 rounded-2xl bg-mist p-4 pl-8 text-sm text-muted">
                      {f.evidence.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">{score.formula}</p>
      </Card>
    </div>
  );
}
