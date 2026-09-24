import Link from 'next/link';
import type { Locale } from '@/i18n/config';

export function LangToggle({ current, label, path = '' }: { current: Locale; label: string; path?: string }) {
  return (
    <nav aria-label={label} className="flex rounded-full border border-line bg-surface p-[3px]">
      {(['es', 'en'] as const).map((l) => (
        <Link
          key={l}
          href={`/${l}${path}`}
          hrefLang={l}
          aria-current={l === current ? 'true' : undefined}
          className={`rounded-full px-3 py-1.5 font-mono text-xs font-bold uppercase ${
            l === current ? 'bg-surface-2 text-ink' : 'text-dim hover:text-ink'
          }`}
        >
          {l}
        </Link>
      ))}
    </nav>
  );
}
