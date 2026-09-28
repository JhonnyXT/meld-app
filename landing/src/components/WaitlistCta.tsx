import { ArrowUpRight } from 'lucide-react';
import type { Dictionary, Locale } from '@/i18n/config';

// La lista de espera vive en joblan (misma cuenta y segmento de Resend que antes usaba esta landing).
const JOBLAN_URL = process.env.NEXT_PUBLIC_JOBLAN_URL || 'https://joblanstudio.vercel.app';

export function waitlistHref(locale: Locale) {
  return `${JOBLAN_URL}/${locale}?app=meld#avisame`;
}

export function WaitlistCta({
  t,
  locale,
  note,
  className = '',
}: {
  t: Dictionary['waitlist'];
  locale: Locale;
  note?: string;
  className?: string;
}) {
  return (
    <div className={`flex w-full max-w-[480px] flex-col items-center gap-2.5 ${className}`}>
      <p className="text-[13px] font-semibold text-dim">{t.label}</p>
      <a
        href={waitlistHref(locale)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-coral-btn px-[22px] text-[15px] font-bold whitespace-nowrap text-white transition-colors hover:bg-coral-btn-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral sm:w-auto sm:rounded-full"
      >
        {t.submit}
        <ArrowUpRight size={17} strokeWidth={2.5} aria-hidden />
      </a>
      {note && <p className="text-center text-xs text-faint sm:text-[13px]">{note}</p>}
    </div>
  );
}
