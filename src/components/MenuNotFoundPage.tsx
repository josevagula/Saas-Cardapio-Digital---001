import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { SushiLogoEmblem } from './SushiIcons';

export default function MenuNotFoundPage() {
  return (
    <div className="min-h-screen w-full bg-[#0C0A08] flex flex-col items-center justify-center gap-5 px-6 text-center">
      <SushiLogoEmblem size={48} />
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-xl font-display font-extrabold text-[#F5F0EA]">
          Cardápio não encontrado
        </h1>
        <p className="text-sm text-[#B8AFA3] leading-relaxed">
          O link que você acessou está incorreto ou não existe mais. Verifique o endereço com o
          estabelecimento e tente novamente.
        </p>
      </div>
    </div>
  );
}
