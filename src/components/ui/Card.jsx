export default function Card({ title, aside, children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`rounded-3xl border border-line bg-white p-5 sm:p-6 ${className}`}>
      {(title || aside) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
          {aside}
        </header>
      )}
      {children}
    </Tag>
  );
}
