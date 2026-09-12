import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { PrinterProfile, PrinterRole, PrintingConfig } from '../types';
import { DEFAULT_PRINTING_CONFIG } from '../data/mockData';
import {
  pairNewPrinter,
  reconnectPrinter,
  disconnectPrinter,
  forgetPrinter,
  subscribePrinterStatus,
  getPrinterStatus,
  printTest,
  subscribeQueue,
  getQueueSnapshot,
  retryJob,
  PrintJob
} from '../lib/printing/printService';
import { isWebBluetoothSupported, PrinterConnectionStatus } from '../lib/printing/bluetoothTransport';
import {
  Printer,
  Bluetooth,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  AlertTriangle,
  RotateCw,
  Zap,
  History
} from 'lucide-react';

const ROLE_LABELS: Record<PrinterRole, string> = {
  geral: 'Geral',
  cozinha: 'Cozinha',
  balcao: 'Balcão',
  delivery: 'Delivery'
};

const STATUS_META: Record<PrinterConnectionStatus, { label: string; dot: string; text: string }> = {
  conectado: { label: 'Conectado', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  desconectado: { label: 'Desconectado', dot: 'bg-red-500', text: 'text-red-400' },
  reconectando: { label: 'Reconectando...', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300' }
};

const JOB_STATUS_META: Record<PrintJob['status'], { label: string; class: string }> = {
  pendente: { label: 'Pendente', class: 'bg-slate-800/50 text-slate-300 border border-slate-600/40' },
  imprimindo: { label: 'Imprimindo', class: 'bg-blue-950/40 text-blue-300 border border-blue-800/40' },
  impresso: { label: 'Impresso', class: 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' },
  erro: { label: 'Erro', class: 'bg-red-950/40 text-red-300 border border-red-800/40' }
};

function usePrinterStatus(printerId: string): PrinterConnectionStatus {
  const [status, setStatus] = useState<PrinterConnectionStatus>(() => getPrinterStatus(printerId));
  useEffect(() => subscribePrinterStatus(printerId, setStatus), [printerId]);
  return status;
}

function useQueue(): PrintJob[] {
  const [jobs, setJobs] = useState<PrintJob[]>(() => getQueueSnapshot());
  useEffect(() => subscribeQueue(setJobs), []);
  return jobs;
}

function PrinterCard({
  printer,
  establishmentName,
  accentMode,
  onRemove
}: {
  printer: PrinterProfile;
  establishmentName: string;
  accentMode: PrintingConfig['accentMode'];
  onRemove: (id: string) => void;
}) {
  const status = usePrinterStatus(printer.id);
  const meta = STATUS_META[status];
  const [busy, setBusy] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const handleToggleConnection = async () => {
    setBusy(true);
    try {
      if (status === 'conectado') {
        await disconnectPrinter(printer.id);
      } else {
        const ok = await reconnectPrinter(printer.id);
        if (!ok) alert('Não foi possível reconectar automaticamente. Use "Substituir Pareamento" para parear esta impressora novamente.');
      }
    } catch (e: any) {
      alert(e?.message || 'Falha ao conectar com a impressora.');
    } finally {
      setBusy(false);
    }
  };

  const handleRepair = async () => {
    setBusy(true);
    try {
      await pairNewPrinter(printer.id);
    } catch (e: any) {
      alert(e?.message || 'Falha ao parear a impressora.');
    } finally {
      setBusy(false);
    }
  };

  const handleTest = () => {
    printTest(printer.id, printer.name, establishmentName, accentMode, printer.paperWidth);
    setTestFeedback('Teste enviado para a fila de impressão.');
    setTimeout(() => setTestFeedback(null), 4000);
  };

  return (
    <div className="bg-[#181512] p-4 rounded-xl border border-[#2A211A] flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#FB923C] shrink-0" />
            <h4 className="text-sm font-bold text-[#F5F0EA] truncate">{printer.name}</h4>
          </div>
          <p className="text-[11px] text-[#A8A29A] mt-1">
            {ROLE_LABELS[printer.role]} · {printer.paperWidth}mm
            {printer.lastConnectedAt && ` · Última conexão: ${new Date(printer.lastConnectedAt).toLocaleString('pt-BR')}`}
          </p>
        </div>
        <button
          onClick={() => { if (confirm(`Remover a impressora "${printer.name}"?`)) onRemove(printer.id); }}
          className="p-1.5 rounded-lg text-[#A8A29A] hover:text-red-400 hover:bg-[#141210] transition-colors cursor-pointer shrink-0"
          title="Remover Impressora"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`}></span>
        <span className={meta.text}>{meta.label}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={handleToggleConnection}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#141210] border border-[#2A211A] text-slate-200 hover:border-[#3A2E24] transition-colors cursor-pointer disabled:opacity-50"
        >
          {busy && <Loader2 className="w-3 h-3 animate-spin" />}
          <span>{status === 'conectado' ? 'Desconectar' : 'Conectar'}</span>
        </button>
        <button
          onClick={handleRepair}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#141210] border border-[#2A211A] text-slate-200 hover:border-[#3A2E24] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Bluetooth className="w-3 h-3" />
          <span>Substituir Pareamento</span>
        </button>
        <button
          onClick={handleTest}
          disabled={status !== 'conectado'}
          className="flex items-center gap-1.5 px-3 py-1.5 btn-sushi-primary text-white text-[11px] font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="w-3 h-3" />
          <span>Imprimir Teste</span>
        </button>
      </div>
      {testFeedback && <p className="text-[10px] text-emerald-400 font-semibold">{testFeedback}</p>}
    </div>
  );
}

function PairPrinterModal({
  onClose,
  onPaired
}: {
  onClose: () => void;
  onPaired: (profile: Omit<PrinterProfile, 'id' | 'createdAt'>) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<PrinterRole>('geral');
  const [paperWidth, setPaperWidth] = useState<58 | 80>(58);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairing(true);
    setError(null);
    try {
      await onPaired({ name: name.trim() || 'Impressora Bluetooth', role, paperWidth });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Falha ao conectar com a impressora.');
    } finally {
      setPairing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        <div className="p-5 border-b border-[#2A211A] flex items-center justify-between bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white">
          <div className="flex items-center gap-2.5">
            <Bluetooth className="w-5 h-5" />
            <h3 className="font-display font-bold">Conectar Impressora</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-orange-100 hover:bg-orange-700/50 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#1F1209] p-3 rounded-xl border border-[#4A2A10]">
            <AlertTriangle className="w-4.5 h-4.5 text-[#FB923C] shrink-0" />
            <span>Ao confirmar, o navegador vai abrir a lista de dispositivos Bluetooth próximos — selecione sua impressora nela.</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nome (opcional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Impressora Cozinha"
              className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Setor</label>
              <select value={role} onChange={(e: any) => setRole(e.target.value)} className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none">
                <option value="geral" className="bg-[#141210]">Geral</option>
                <option value="cozinha" className="bg-[#141210]">Cozinha</option>
                <option value="balcao" className="bg-[#141210]">Balcão</option>
                <option value="delivery" className="bg-[#141210]">Delivery</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Largura do Papel</label>
              <select value={paperWidth} onChange={(e: any) => setPaperWidth(Number(e.target.value) as 58 | 80)} className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none">
                <option value={58} className="bg-[#141210]">58mm</option>
                <option value={80} className="bg-[#141210]">80mm</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={pairing}
            className="w-full flex items-center justify-center gap-2 py-3 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-60"
          >
            {pairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bluetooth className="w-4 h-4" />}
            <span>{pairing ? 'Procurando dispositivos...' : 'Procurar e Conectar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PrintingManager() {
  const { visualConfig, setVisualConfig } = useApp();
  const savedConfig = visualConfig.printingConfig ?? DEFAULT_PRINTING_CONFIG;

  const [draft, setDraft] = useState<PrintingConfig>(savedConfig);
  const [showPairModal, setShowPairModal] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const jobs = useQueue();

  // Attempt a silent reconnect (no device picker) for every saved printer
  // the moment this screen opens — Chrome remembers the pairing grant, so
  // this is the "reconexão automática" the spec asks for, not a fresh pair.
  useEffect(() => {
    savedConfig.printers.forEach(p => { reconnectPrinter(p.id).catch(() => {}); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraft = <K extends keyof PrintingConfig>(key: K, value: PrintingConfig[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setVisualConfig(prev => ({ ...prev, printingConfig: draft }));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 4000);
  };

  // Printer pairing/removal persists immediately (it's a structural action,
  // not a form field) — kept independent of the toggle-form's `draft` state
  // below it, via each setter's own functional updater, so an in-progress
  // (unsaved) settings edit is never implicitly committed by adding/removing
  // a printer, and vice versa.
  const handlePaired = async (profile: Omit<PrinterProfile, 'id' | 'createdAt'>) => {
    const id = `printer-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const { suggestedName } = await pairNewPrinter(id);
    const newProfile: PrinterProfile = {
      id,
      name: profile.name || suggestedName,
      role: profile.role,
      paperWidth: profile.paperWidth,
      createdAt: new Date().toISOString(),
      lastConnectedAt: new Date().toISOString()
    };
    setVisualConfig(prev => {
      const config = prev.printingConfig ?? DEFAULT_PRINTING_CONFIG;
      return { ...prev, printingConfig: { ...config, printers: [...config.printers, newProfile] } };
    });
    setDraft(prev => ({ ...prev, printers: [...prev.printers, newProfile] }));
  };

  const handleRemovePrinter = (id: string) => {
    forgetPrinter(id);
    setVisualConfig(prev => {
      const config = prev.printingConfig ?? DEFAULT_PRINTING_CONFIG;
      return { ...prev, printingConfig: { ...config, printers: config.printers.filter(p => p.id !== id) } };
    });
    setDraft(prev => ({ ...prev, printers: prev.printers.filter(p => p.id !== id) }));
  };

  const recentJobs = [...jobs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 30);

  const toggles: { key: keyof PrintingConfig; label: string; help: string }[] = [
    { key: 'autoPrintOnReceived', label: 'Impressão automática ao receber pedido', help: 'Imprime assim que um pedido novo chega, sem precisar recarregar a tela.' },
    { key: 'autoPrintOnConfirmed', label: 'Impressão automática ao confirmar pedido', help: 'Imprime quando um pedido pendente é aceito ("Aceitar e Preparar").' },
    { key: 'printObservacoes', label: 'Imprimir observações', help: '' },
    { key: 'printTelefone', label: 'Imprimir telefone do cliente', help: '' },
    { key: 'printEndereco', label: 'Imprimir endereço de entrega', help: '' },
    { key: 'printFormaPagamento', label: 'Imprimir forma de pagamento', help: '' },
    { key: 'autoCutPaper', label: 'Cortar papel automaticamente', help: 'Só funciona em impressoras com guilhotina (corte automático).' }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-printing-manager">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-mono font-semibold text-[#FB923C] uppercase tracking-widest">Configurações</span>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Impressão</h2>
          <p className="text-sm text-[#A8A29A] mt-1">Conecte impressoras térmicas Bluetooth e controle a impressão automática dos pedidos.</p>
        </div>
      </div>

      {!isWebBluetoothSupported() && (
        <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4 mb-6 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#FB923C] shrink-0 mt-0.5" />
          <span>
            Este navegador não suporta Web Bluetooth — use <strong className="text-[#F5F0EA]">Google Chrome</strong> ou <strong className="text-[#F5F0EA]">Microsoft Edge</strong>, no computador ou em um celular/tablet Android.
            <strong className="text-[#F5F0EA]"> Safari/iPhone/iPad não é compatível</strong> (limitação do próprio iOS, sem solução via navegador). Impressoras <strong className="text-[#F5F0EA]">Bluetooth Classic</strong> (sem "BLE"/"Low Energy") também não são acessíveis por nenhum navegador.
          </span>
        </div>
      )}

      {/* Printers */}
      <div className="bg-[#141210] p-6 rounded-2xl border border-[#2A211A] shadow-xs mb-6">
        <div className="flex items-center justify-between mb-4 border-b border-[#2A211A] pb-4">
          <h3 className="text-base font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#FB923C]" />
            Impressoras ({savedConfig.printers.length})
          </h3>
          <button
            onClick={() => setShowPairModal(true)}
            disabled={!isWebBluetoothSupported()}
            className="flex items-center gap-1.5 px-3.5 py-2 btn-sushi-primary text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Conectar Impressora</span>
          </button>
        </div>

        {savedConfig.printers.length === 0 ? (
          <div className="text-center py-10">
            <Bluetooth className="w-10 h-10 text-[#A8A29A]/50 mx-auto mb-3" />
            <p className="text-sm text-[#A8A29A]">Nenhuma impressora conectada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedConfig.printers.map(p => (
              <PrinterCard
                key={p.id}
                printer={p}
                establishmentName={visualConfig.establishmentName}
                accentMode={savedConfig.accentMode}
                onRemove={handleRemovePrinter}
              />
            ))}
          </div>
        )}
      </div>

      {/* Settings form */}
      <form onSubmit={handleSave} className="bg-[#141210] p-6 rounded-2xl border border-[#2A211A] shadow-xs mb-6 max-w-3xl">
        <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-5 border-b border-[#2A211A] pb-4">Preferências de Impressão</h3>

        <div className="space-y-4">
          {toggles.map(t => (
            <div key={t.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-200">{t.label}</p>
                {t.help && <p className="text-[11px] text-[#A8A29A] mt-0.5">{t.help}</p>}
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={!!draft[t.key]}
                  onChange={(e) => updateDraft(t.key, e.target.checked as any)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#0C0A08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
              </label>
            </div>
          ))}

          <div className="pt-2 border-t border-[#2A211A] mt-2">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 mt-4">Codificação de Acentos (avançado)</label>
            <select
              value={draft.accentMode}
              onChange={(e: any) => updateDraft('accentMode', e.target.value)}
              className="w-full sm:w-72 px-3.5 py-2.5 text-xs input-sushi focus:outline-none"
            >
              <option value="ascii" className="bg-[#141210]">Sem acentos (compatível com qualquer impressora)</option>
              <option value="cp860" className="bg-[#141210]">CP860 - Português (teste antes de usar)</option>
            </select>
            <p className="text-[11px] text-[#A8A29A] mt-1.5">Use "Imprimir Teste" para conferir se sua impressora exibe os acentos corretamente antes de trocar o padrão.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#2A211A]">
          <button type="submit" className="px-6 py-3 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer">
            Salvar Configurações
          </button>
          {justSaved && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
              <Check className="w-4 h-4" />
              Configurações salvas com sucesso!
            </span>
          )}
        </div>
      </form>

      {/* Print queue / log */}
      <div className="bg-[#141210] rounded-2xl border border-[#2A211A] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#2A211A]">
          <h3 className="text-base font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
            <History className="w-5 h-5 text-[#FB923C]" />
            Fila e Histórico de Impressão
          </h3>
          <p className="text-xs text-[#A8A29A] mt-1">Últimas {recentJobs.length} impressões — pendências falhas podem ser reenviadas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#181512] border-b border-[#2A211A] text-[#A8A29A] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-6 font-bold">Pedido</th>
                <th className="py-3 px-6 font-bold">Impressora</th>
                <th className="py-3 px-6 font-bold">Data/Hora</th>
                <th className="py-3 px-6 font-bold text-center">Status</th>
                <th className="py-3 px-6 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A211A]">
              {recentJobs.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-[#A8A29A]">Nenhuma impressão registrada ainda.</td></tr>
              ) : recentJobs.map(job => (
                <tr key={job.id} className="hover:bg-[#181512] transition-colors">
                  <td className="py-3 px-6 font-semibold text-[#F5F0EA]">
                    {job.kind === 'teste' ? 'Teste de Impressão' : (job.orderCode || job.orderId)}
                  </td>
                  <td className="py-3 px-6 text-slate-300">{job.printerName}</td>
                  <td className="py-3 px-6 font-mono text-[#A8A29A]">{new Date(job.updatedAt).toLocaleString('pt-BR')}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${JOB_STATUS_META[job.status].class}`}>
                      {JOB_STATUS_META[job.status].label}
                    </span>
                    {job.errorMessage && <p className="text-[10px] text-red-400 mt-1 max-w-xs">{job.errorMessage}</p>}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {job.status === 'erro' && (
                      <button
                        onClick={() => retryJob(job.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] hover:bg-[#2A180C] rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        <RotateCw className="w-3 h-3" />
                        Tentar novamente
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPairModal && (
        <PairPrinterModal onClose={() => setShowPairModal(false)} onPaired={handlePaired} />
      )}
    </div>
  );
}
