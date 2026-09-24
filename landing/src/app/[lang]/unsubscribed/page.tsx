import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getDictionary, hasLocale } from '@/i18n/config';

/** Página a la que llega `/api/unsubscribe` tras procesar la baja. No tiene
 * un formulario propio en el sitio (no expone "escribe tu email para darte
 * de baja" — eso invitaría a que cualquiera dé de baja a cualquiera); solo
 * confirma el resultado de un enlace que llegó dentro de un email. */
export default async function Page({ params, searchParams }: PageProps<'/[lang]/unsubscribed'>) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { ok } = await searchParams;
  const s = getDictionary(lang).unsubscribe;
  const success = ok !== '0';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-center gap-5 px-6 text-center">
      <Image src="/img/meld-icon.png" alt="" width={56} height={56} className="rounded-2xl" />
      <div className={`flex size-14 items-center justify-center rounded-full ${success ? 'bg-t-habit/15 text-t-habit' : 'bg-coral/15 text-coral'}`}>
        {success ? <Check size={26} /> : <X size={26} />}
      </div>
      <h1 className="text-2xl font-extrabold">{success ? s.okTitle : s.errorTitle}</h1>
      <p className="text-[15px] leading-relaxed text-dim">{success ? s.okBody : s.errorBody}</p>
      <Link href={`/${lang}`} className="mt-2 rounded-full bg-surface-2 px-5 py-2.5 text-sm font-semibold hover:bg-line">
        {s.backHome}
      </Link>
    </main>
  );
}
