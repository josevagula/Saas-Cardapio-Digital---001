import React, { useEffect, useState } from 'react';
import { Printer, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getPrinterStatus,
  getReconnectIssue,
  reconnectPrinterWithPicker,
  subscribePrinterStatus,
  subscribeReconnectIssues
} from '../lib/printing/printService';

// Global (every admin screen) one-click way back to a connected printer on
// browsers that can't reconnect silently after a page reload — Chrome
// without persistent Web Bluetooth permissions forgets the grant on every
// refresh, and no website can change that or skip the browser's own picker.
// So the next best thing: a single button right where the admin already is,
// opening the picker pre-filtered to just their printer ("click it, Parear").
export default function PrinterReconnectBanner() {
  const { visualConfig } = useApp();
  const printers = visualConfig.printingConfig?.printers ?? [];
  const [, force] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const idsKey = printers.map(p => p.id).join(',');
  useEffect(() => {
    const rerender = () => force(n => n + 1);
    const unsubs = printers.map(p => subscribePrinterStatus(p.id, rerender));
    unsubs.push(subscribeReconnectIssues(rerender));
    return () => unsubs.forEach(u => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const needing = printers.filter(p => {
    if (getPrinterStatus(p.id) !== 'desconectado') return false;
    const issue = getReconnectIssue(p.id);
    return issue === 'sem-permissao-persistente' || issue === 'dispositivo-esquecido';
  });

  if (dismissed || needing.length === 0) return null;

  const handleClick = async (printerId: string, showAll = false) => {
    setBusyId(printerId);
    setError(null);
    try {
      await reconnectPrinterWithPicker(printerId, showAll);
    } catch (e: any) {
      // Closing the picker without choosing isn't an error worth showing.
      if (e?.name !== 'NotFoundError') setError(e?.message || 'Falha ao reconectar a impressora.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[360px] z-40 bg-[#181512] border border-[#FB923C]/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#FB923C]/15 shrink-0">
          <Printer className="w-4 h-4 text-[#FB923C]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#F5F0EA]">Impressora desconectada</p>
          <p className="text-[11px] text-[#A8A29A] leading-snug mt-0.5">
            Clique no botão, selecione a impressora na janela do navegador e clique em <b>Parear</b>.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-[#A8A29A] hover:text-[#F5F0EA] cursor-pointer shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {needing.map(p => (
        <div key={p.id} className="flex flex-col gap-1">
          <button
            onClick={() => handleClick(p.id)}
            disabled={busyId !== null}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 btn-sushi-primary text-white text-sm font-bold cursor-pointer disabled:opacity-50"
          >
            {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            <span className="truncate">Reconectar {needing.length > 1 ? `"${p.name}"` : 'impressora'}</span>
          </button>
          <button
            onClick={() => handleClick(p.id, true)}
            disabled={busyId !== null}
            className="text-[10px] text-[#A8A29A] hover:text-[#F5F0EA] underline cursor-pointer self-center disabled:opacity-50"
          >
            A impressora não aparece na lista? Mostrar todos os dispositivos
          </button>
        </div>
      ))}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
