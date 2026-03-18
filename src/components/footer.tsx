'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { VuraSignature } from '@/components/vura-signature';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-[#0a0a0f]/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70 flex-shrink-0" />
            <p className="text-center sm:text-left">
              <span className="font-medium text-white/50">Disclaimer:</span>{' '}
              Bintan Drive adalah platform manajemen armada. Fitur Remote Kill Engine adalah tanggung jawab penuh admin operasional.{' '}
              <Link 
                href="/disclaimer" 
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                [Selengkapnya]
              </Link>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <VuraSignature className="bg-white/[0.03]" label="Powered by" />
            <p className="text-[10px] text-white/30">
              © 2024 Bintan Drive. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
