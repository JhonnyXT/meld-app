import Image from 'next/image';
import Link from 'next/link';
import type { Dictionary, Locale } from '@/i18n/config';

// TODO(dueño del proyecto): el enlace de Soporte sigue vacío hasta tener un
// email/página de contacto real.
export function Footer({ t, locale }: { t: Dictionary['footer']; locale: Locale }) {
  return (
    <footer className="mx-auto flex w-[calc(100%-40px)] max-w-[760px] flex-col items-center gap-3 border-t border-line pt-8 pb-7 sm:gap-3.5 sm:pt-10 sm:pb-12">
      <Image src="/img/meld-icon.png" alt="" width={52} height={52} className="size-11 rounded-xl sm:size-[52px] sm:rounded-[14px]" />
      <span className="text-[17px] font-extrabold sm:text-lg">Meld</span>
      <nav aria-label="Footer" className="flex flex-wrap justify-center gap-[18px] text-sm sm:gap-[22px]">
        <Link href={`/${locale}/privacy`} className="text-dim hover:text-ink">{t.privacy}</Link>
        <Link href={`/${locale}/terms`} className="text-dim hover:text-ink">{t.terms}</Link>
        <a href="mailto:jonathanblandon1017@gmail.com" className="text-dim hover:text-ink">{t.support}</a>
      </nav>
      <span className="text-xs text-faint">{t.rights}</span>
    </footer>
  );
}
