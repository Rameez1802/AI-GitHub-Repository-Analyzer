// Shared colour mapping for finding severities.
export const SEVERITY = {
  critical: { label: 'Critical', chip: 'bg-removed text-white', tone: 'bad' },
  high: { label: 'High', chip: 'bg-removed/15 text-removed', tone: 'bad' },
  medium: { label: 'Medium', chip: 'bg-changed/15 text-changed', tone: 'warn' },
  low: { label: 'Low', chip: 'bg-brand-50 text-brand-700', tone: 'brand' },
  info: { label: 'Info', chip: 'bg-mist text-muted', tone: 'neutral' },
};
export const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

export const toneFor = (score) =>
  score >= 70 ? { text: 'text-added', bg: 'bg-added', hex: '#1f9d6b' } : score >= 50 ? { text: 'text-changed', bg: 'bg-changed', hex: '#c9811a' } : { text: 'text-removed', bg: 'bg-removed', hex: '#e2475b' };

export const loc = (f) => (f.line ? `${f.file}:${f.line}${f.endLine && f.endLine !== f.line ? `-${f.endLine}` : ''}` : f.file);
