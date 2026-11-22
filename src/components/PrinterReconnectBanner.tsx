import React, { useState } from 'react';
import { X, Copy, Check, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
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
        <li>Volte aqui, abra a tela <b>Impressora</b> e clique em <b>Reconectar</b> uma última vez.</li>
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

// Global (every admin screen), shown ONCE per browser: the one-time guide for
// making the printer reconnect by itself after every page reload.
export default function PrinterReconnectBanner() {
  const { visualConfig } = useApp();
  const printers = visualConfig.printingConfig?.printers ?? [];
  const [guideDismissed, setGuideDismissed] = useState(readGuideDismissed);

  if (printers.length === 0 || guideDismissed || !browserForgetsBluetoothGrants()) return null;

  const closeGuide = () => {
    persistGuideDismissed();
    setGuideDismissed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[380px] z-40 max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <AutoReconnectGuide onClose={closeGuide} />
    </div>
  );
}
