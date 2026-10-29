export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const compact = (n) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);

export function timeAgo(iso) {
  if (!iso) return 'unknown';
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) return `${value} ${name}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function formatDate(iso) {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const percent = (n) => `${Math.round(n)}%`;
