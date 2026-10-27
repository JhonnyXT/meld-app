import type { Locale } from '@/i18n/config';

/**
 * Monograma JB de Joblan Studio, vectorial (fuente: ../../joblan/brand/jb.svg, el mismo que usa
 * joblan-web en su header/footer). `fill="currentColor"` para seguir el tema claro/oscuro del sitio
 * donde se use, sin depender de un PNG ni de la paleta de otra marca.
 */
function JbMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 1392 876" className={className} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M375 0L264 188H437V635L386 688H270L219 635V448L0 579V712L164 875H491L655 712V0ZM737 0V739L602 875H1228L1392 712V530L1286 423L1378 330V152L1227 0ZM955 188V330H1120L1161 289V230L1120 188ZM955 518V688H1122L1173 636V569L1122 518Z"
      />
    </svg>
  );
}

/** Crédito al final de la página: enlaza al inicio de joblanstudio.com en el mismo idioma. */
export function MadeByJoblan({ label, locale }: { label: string; locale: Locale }) {
  return (
    <a
      href={`https://joblanstudio.com/${locale}`}
      target="_blank"
      rel="noopener"
      className="flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-dim"
    >
      {label}
      <JbMark className="h-3 w-auto" />
      Joblan
    </a>
  );
}
