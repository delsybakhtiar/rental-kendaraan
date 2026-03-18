'use client';

import { cn } from '@/lib/utils';

interface VuraSignatureProps {
  className?: string;
  label?: string;
}

export function VuraSignature({
  className,
  label = 'Developed by',
}: VuraSignatureProps) {
  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.18)]', className)}>
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.96] p-1.5">
        <img
          src="/branding/vura-design.svg"
          alt="Vura Design"
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
      <div className="leading-tight">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">{label}</p>
        <p className="text-xs font-medium text-white/85">Vura Design</p>
      </div>
    </div>
  );
}
