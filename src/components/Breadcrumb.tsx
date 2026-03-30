import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const parents = items.slice(0, -1);
  const current = items[items.length - 1];

  return (
    <div className="mb-6">
      {parents.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-[rgba(255,255,255,0.25)] mb-2 tracking-wide">
          {parents.map((item, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1">/</span>}
              {item.href ? (
                <Link to={item.href} className="hover:text-[rgba(255,255,255,0.5)] transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span>{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {current && (
        <h1 className="text-4xl font-extrabold tracking-tight leading-none text-white">
          {current.label}
        </h1>
      )}
    </div>
  );
}
