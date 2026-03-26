import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-[rgba(255,255,255,0.3)] mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="mx-1">/</span>}
          {i < items.length - 1 && item.href ? (
            <Link to={item.href} className="hover:text-[rgba(255,255,255,0.7)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[rgba(255,255,255,0.7)] font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
