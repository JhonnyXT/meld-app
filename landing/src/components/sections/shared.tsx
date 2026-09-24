import type { ReactNode } from 'react';

/** Ícono o texto encajado dentro de un título ("Seis cosas, [↻] una sola línea"). */
export function InlineChip({ children }: { children: ReactNode }) {
  return (
    <span className="mx-1 inline-flex h-[38px] items-center rounded-[10px] border border-line bg-surface-2 px-2.5 align-middle sm:mx-1.5 sm:h-14 sm:rounded-[14px] sm:px-3.5">
      {children}
    </span>
  );
}

export function SectionHead({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:gap-3.5">
      <h2 className="text-[31px] leading-[1.25] font-extrabold tracking-[-0.03em] sm:text-[46px] sm:leading-[1.2]">{title}</h2>
      <p className="max-w-[520px] text-base leading-relaxed text-dim sm:text-lg">{subtitle}</p>
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-[calc(100%-40px)] max-w-[760px] bg-line" />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-coral uppercase">{children}</span>;
}
