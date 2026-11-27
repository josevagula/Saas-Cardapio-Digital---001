import React, { useState } from 'react';
import { Minus, Plus, Image as ImageIcon, FileText, Printer, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { baixarPDF, baixarPNG, compartilharPNG, imprimirPedido, linkWhatsApp, PedidoExport, textoWhatsApp } from './mercadosShared';
import type { Notify } from '../MercadosManager';

export const CARD = 'bg-[#141210] rounded-2xl border border-[#2A211A] shadow-xs';
export const INPUT = 'w-full px-3 py-2.5 text-sm input-sushi focus:outline-none';
export const LABEL = 'text-[11px] font-semibold text-slate-300 block mb-1';
export const BTN_PRIMARY = 'flex items-center justify-center gap-1.5 px-4 py-2.5 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const BTN_SECONDARY = 'flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#2A211A] bg-[#141210] text-slate-200 hover:bg-[#2A211A] hover:text-[#F5F0EA] transition-colors cursor-pointer text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed';
export const BTN_ACCENT = 'flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#4A2A10] bg-[#1F1209] text-[#F97316] hover:bg-[#2A180C] transition-colors cursor-pointer text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed';
export const BTN_DANGER = 'flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#4A1616] bg-[#1F0B0B] text-red-400 hover:bg-[#2A0F0F] hover:text-red-300 transition-colors cursor-pointer text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed';

export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className={`${CARD} p-8 sm:p-12 text-center`}>
      <div className="w-14 h-14 rounded-2xl bg-[#1F1209] border border-[#4A2A10] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-[#FB923C]" />
      </div>
      <h4 className="text-lg font-bold text-[#F5F0EA]">{title}</h4>
      <p className="text-sm text-[#A8A29A] mt-1 max-w-md mx-auto">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// Quantidade grande e fácil no celular: − [ 12 ] +
export function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const btn = 'w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-colors cursor-pointer select-none shrink-0 disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Diminuir"
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className={`${btn} bg-[#181512] border-[#2A211A] text-slate-200 hover:bg-[#2A211A]`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={32767}
        value={value === 0 ? '' : value}
        placeholder="0"
        onFocus={e => e.target.select()}
        onChange={e => {
          const n = Math.floor(Number(e.target.value));
          onChange(Number.isFinite(n) ? Math.min(32767, Math.max(0, n)) : 0);
        }}
        className={`w-16 h-11 sm:h-10 text-center text-lg font-mono font-bold rounded-xl input-sushi focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none ${value > 0 ? 'text-[#F5F0EA]' : 'text-[#A8A29A]'}`}
      />
      <button
        type="button"
        aria-label="Aumentar"
        onClick={() => onChange(Math.min(32767, value + 1))}
        className={`${btn} bg-[#1F1209] border-[#4A2A10] text-[#F97316] hover:bg-[#2A180C]`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// PNG, PDF, compartilhar, WhatsApp e imprimir — tudo gerado no navegador.
export function ExportActions({ pedido, telefone, notify }: { pedido: PedidoExport; telefone: string | null; notify: Notify }) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown> | unknown, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) notify(ok);
    } catch (e: any) {
      notify(e?.message || 'Não foi possível concluir.', 'erro');
    } finally {
      setBusy(null);
    }
  };
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator;

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
      <a
        href={linkWhatsApp(telefone, textoWhatsApp(pedido))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => { if (!telefone) notify('Este mercado não tem telefone cadastrado — escolha o contato no WhatsApp.', 'erro'); }}
        className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#166534] bg-[#0F1F14] text-[#86EFAC] hover:bg-[#14301C] transition-colors text-xs font-bold"
      >
        <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
      </a>
      {canShare && (
        <button className={BTN_ACCENT} disabled={!!busy} onClick={() => run('share', async () => {
          const ok = await compartilharPNG(pedido);
          if (!ok) { await baixarPNG(pedido); notify('Imagem baixada (seu navegador não permite compartilhar arquivos).'); }
        })}>
          {busy === 'share' ? <Spinner /> : <Share2 className="w-4 h-4" />} Compartilhar imagem
        </button>
      )}
      <button className={BTN_SECONDARY} disabled={!!busy} onClick={() => run('png', () => baixarPNG(pedido), 'Imagem PNG gerada.')}>
        {busy === 'png' ? <Spinner /> : <ImageIcon className="w-4 h-4" />} PNG
      </button>
      <button className={BTN_SECONDARY} disabled={!!busy} onClick={() => run('pdf', () => baixarPDF(pedido), 'PDF gerado.')}>
        {busy === 'pdf' ? <Spinner /> : <FileText className="w-4 h-4" />} PDF
      </button>
      <button className={BTN_SECONDARY} disabled={!!busy} onClick={() => run('print', () => imprimirPedido(pedido))}>
        <Printer className="w-4 h-4" /> Imprimir
      </button>
    </div>
  );
}

// Tabela no formato da planilha: Produto | Qtd. | Custo Unit. | Total
export function PedidoTabela({ titulo, data, linhas, brl }: { titulo: string; data: string; linhas: { nome: string; qtd: number; preco_centavos: number }[]; brl: (c: number) => string }) {
  const visiveis = linhas.filter(l => l.qtd > 0);
  const total = visiveis.reduce((s, l) => s + l.qtd * l.preco_centavos, 0);
  return (
    <div className="rounded-xl overflow-hidden border border-[#2A211A]">
      <div className="bg-gradient-to-r from-[#C2410C] to-[#F97316] px-4 py-3 text-white">
        <p className="font-display font-extrabold uppercase tracking-tight break-words">{titulo}</p>
        <p className="text-xs text-orange-100 font-mono">Data: {data}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[440px]">
          <thead>
            <tr className="bg-[#0C0A08] text-[10px] font-mono uppercase tracking-wider text-[#A8A29A]">
              <th className="text-left font-bold px-3 py-2">Produto</th>
              <th className="text-center font-bold px-3 py-2 w-16">Qtd.</th>
              <th className="text-right font-bold px-3 py-2 w-28">Custo Unit.</th>
              <th className="text-right font-bold px-3 py-2 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l, i) => (
              <tr key={i} className={`border-t border-[#2A211A] ${i % 2 ? 'bg-[#181512]' : ''}`}>
                <td className="px-3 py-2 text-[#F5F0EA]">{l.nome}</td>
                <td className="px-3 py-2 text-center font-mono font-bold">{l.qtd}</td>
                <td className="px-3 py-2 text-right font-mono text-[#A8A29A] whitespace-nowrap">{brl(l.preco_centavos)}</td>
                <td className="px-3 py-2 text-right font-mono whitespace-nowrap">{brl(l.qtd * l.preco_centavos)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#F97316] bg-[#1F1209]">
              <td colSpan={3} className="px-3 py-3 font-extrabold text-[#F5F0EA]">TOTAL</td>
              <td className="px-3 py-3 text-right font-mono font-extrabold text-[#FB923C] text-base whitespace-nowrap">{brl(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
