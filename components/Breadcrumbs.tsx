import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { breadcrumbLd } from '../src/seo.ts';
import JsonLd from './JsonLd';

/** Visible trail + matching BreadcrumbList structured data. Last item = current page. */
export default function Breadcrumbs({ trail }: { trail: [string, string][] }) {
  return (
    <>
      <nav aria-label="Fil d’Ariane" className="text-xs text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {trail.map(([name, path], i) => (
            <li key={path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-faint" aria-hidden />}
              {i === trail.length - 1 ? <span aria-current="page" className="text-text">{name}</span>
                : <Link href={path} className="hover:text-text hover:underline">{name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(trail)} />
    </>
  );
}
