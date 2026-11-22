import React, { useEffect, useState } from 'react';
import { Printer, Loader2, X, Copy, Check, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getPrinterStatus,
  getReconnectIssue,
  reconnectPrinterWithPicker,
  subscribePrinterStatus,
  subscribeReconnectIssues
} from '../lib/printing/printService';
import { isWebBluetoothSupported } from '../lib/printing/bluetoothTransport';

// Per-browser: once the admin closes the setup guide it never comes back on
// this computer (the guide is only ever useful once per browser anyway).
const GUIDE_DISMISSED_KEY = 'zushy_bt_autoreconnect_guide_dismissed';

function readGuideDismissed(): boolean {
  try { return localStorage.getItem(GUIDE_DISMISSED_KEY) === '1'; } catch { return false; }
}

function persistGuideDismissed() {
  try { localStorage.setItem(GUIDE_DISMISSED_KEY, '1'); } catch { /* storage blocked — just hides for this session */ }
}

// Without getDevices() the browser forgets every Bluetooth grant on reload,
// so silent auto-reconnect is impossible until the persistent-permissions
// backend flag is enabled. A website can't flip that flag or even open a
// chrome:// page, so the best it can do is walk the admin through it once.
function browserForgetsBluetoothGrants(): boolean {
  return isWebBluetoothSupported() && typeof (navigator as any).bluetooth.getDevices !== 'function';
}

function flagUrl(): string {
  const isEdge = typeof navigator !== 'undefined' && /\bEdg\//.test(navigator.userAgent);
  return `${isEdge ? 'edge' : 'chrome'}://flags/#enable-web-bluetooth-new-permissions-backend`;
}

function AutoReconnectGuide({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = flagUrl();
  const browserName = url.startsWith('edge') ? 'Edge' : 'Chrome';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard blocked — the address is shown as selectable text below.
    }
  };

  return (
    <div className="bg-[#181512] border border-[#FB923C]/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#FB923C]/15 shrink-0">
          <Zap className="w-4 h-4 text-[#FB923C]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#F5F0EA]">Ativar reconexão automática da impressora</p>
          <p className="text-[11px] text-[#A8A29A] leading-snug mt-0.5">
            Faça isso uma única vez neste computador e a impressora volta sozinha sempre que a página for atualizada.
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#A8A29A] hover:text-[#F5F0EA] cursor-pointer shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ol className="text-[11px] text-[#F5F0EA] leading-snug flex flex-col gap-2 list-decimal pl-4">
        <li>
          Copie o endereço abaixo, abra uma <b>nova aba</b> e cole na barra de endereço.
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate select-all bg-[#141210] border border-[#2A211A] rounded-lg px-2 py-1.5 text-[10px] text-[#A8A29A]">{url}</code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#141210] border border-[#2A211A] text-slate-200 hover:border-[#3A2E24] cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </li>
        <li>Na opção destacada, troque <b>Default (Padrão)</b> por <b>Enabled (Ativado)</b>.</li>
        <li>Clique em <b>Relaunch (Reiniciar)</b> para reiniciar o {browserName}.</li>
        <li>Volte aqui e clique em <b>Reconectar impressora</b> uma última vez.</li>
      </ol>

      <button
        onClick={onClose}
        className="w-full px-3 py-2 rounded-lg text-[11px] font-bold bg-[#141210] border border-[#2A211A] text-slate-200 hover:border-[#3A2E24] cursor-pointer"
      >
        Entendi
      </button>
    </div>
  );
}

// Global (every admin screen) one-click way back to a connected printer on
// browsers that can't reconnect silently after a page reload — Chrome
// without persistent Web Bluetooth permissions forgets the grant on every
// refresh, and no website can change that or skip the browser's own picker.
// So the next best thing: a single button right where the admin already is,
// opening the picker pre-filtered to just their printer ("click it, Parear"),
// plus the one-time guide above for making reconnection automatic for good.
export default function PrinterReconnectBanner() {
  const { visualConfig } = useApp();
  const printers = visualConfig.printingConfig?.printers ?? [];
  const [, force] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(readGuideDismissed);

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

  const showGuide = printers.length > 0 && !guideDismissed && browserForgetsBluetoothGrants();
  const showReconnect = !dismissed && needing.length > 0;

  if (!showGuide && !showReconnect) return null;

  const closeGuide = () => {
    persistGuideDismissed();
    setGuideDismissed(true);
  };

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
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-40 flex flex-col gap-3 max-h-[calc(100dvh-2rem)] overflow-y-auto">
      {showGuide && <AutoReconnectGuide onClose={closeGuide} />}
      {showReconnect && (
        <div className="bg-[#181512] border border-[#FB923C]/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
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
      )}
    </div>
  );
}
