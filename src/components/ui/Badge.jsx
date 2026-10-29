const styles = {
  neutral: 'bg-mist text-muted',
  brand: 'bg-brand-50 text-brand-700',
  good: 'bg-added/10 text-added',
  warn: 'bg-changed/10 text-changed',
  bad: 'bg-removed/10 text-removed',
};

export default function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]} ${className}`}>
      {children}
    </span>
  );
}
