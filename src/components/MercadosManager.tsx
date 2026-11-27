import React, { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardList, History, Store, CheckCircle2, AlertCircle, X, TrendingUp } from 'lucide-react';
import VendasMercados from './mercados/VendasMercados';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { listMercados, Mercado } from '../lib/mercadosRepo';
import PainelMercados from './mercados/PainelMercados';
import LancarPedido from './mercados/LancarPedido';
import HistoricoPedidos from './mercados/HistoricoPedidos';
import CadastroMercados from './mercados/CadastroMercados';

// Página "Mercados": venda de revenda/atacado para supermercados.
// Só existe no painel do administrador (Sidebar) — o cardápio público não
// tem nenhum caminho até aqui, e o RLS restringe os dados ao dono logado.

export type MercadosTab = 'painel' | 'vendas' | 'lancar' | 'historico' | 'cadastro';
export type Notify = (msg: string, tipo?: 'ok' | 'erro') => void;

const TABS: { id: MercadosTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'painel', label: 'Painel', icon: LayoutDashboard },
  { id: 'vendas', label: 'Vendas', icon: TrendingUp },
  { id: 'lancar', label: 'Lançar Pedido', icon: ClipboardList },
  { id: 'historico', label: 'Histórico', icon: History },
  { id: 'cadastro', label: 'Mercados e Produtos', icon: Store }
];

export default function MercadosManager() {
  const { isDemoMode } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<MercadosTab>('painel');
  const [mercados, setMercados] = useState<Mercado[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'erro' } | null>(null);
  // Pedido aberto para edição na aba "Lançar Pedido" (vindo do Histórico).
  const [editPedidoId, setEditPedidoId] = useState<number | null>(null);
  const [cadastroFoco, setCadastroFoco] = useState<number | 'novo' | null>(null);

  const notify: Notify = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo });
    window.setTimeout(() => setToast(t => (t?.msg === msg ? null : t)), 4000);
  }, []);

  const recarregarMercados = useCallback(async () => {
    if (!user || isDemoMode) return;
    try {
      setLoadError(null);
      setMercados(await listMercados());
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, isDemoMode]);

  useEffect(() => {
    recarregarMercados();
  }, [recarregarMercados]);

  const irParaCadastro = (foco: number | 'novo' | null = null) => {
    setCadastroFoco(foco);
    setTab('cadastro');
  };

  const editarPedido = (id: number) => {
    setEditPedidoId(id);
    setTab('lancar');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-mercados">
      <div className="mb-6">
        <span className="text-xs font-mono font-semibold text-[#FB923C] uppercase tracking-widest">Revenda / Atacado</span>
        <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Mercados</h2>
        <p className="text-sm text-[#A8A29A] mt-1">Pedidos, preços, pagamentos e totais da sua venda para supermercados.</p>
      </div>

      <div className="flex items-center gap-1 mb-6 overflow-x-auto border-b border-[#2A211A] pb-px -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => {
              if (t.id !== 'lancar') setEditPedidoId(null);
              if (t.id !== 'cadastro') setCadastroFoco(null);
              setTab(t.id);
            }}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 cursor-pointer transition-colors ${
              tab === t.id ? 'border-[#F97316] text-[#F97316]' : 'border-transparent text-[#A8A29A] hover:text-slate-200'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {isDemoMode ? (
        <div className="text-xs text-[#A8A29A] bg-[#1F1209] border border-[#4A2A10] rounded-lg p-4">
          Modo demonstração: o módulo Mercados fica disponível assim que você entrar com sua conta real.
        </div>
      ) : loadError ? (
        <div className="flex items-center justify-between gap-3 text-sm text-red-300 bg-[#1F0B0B] border border-[#4A1616] rounded-xl p-4">
          <span>{loadError}</span>
          <button onClick={recarregarMercados} className="px-3 py-1.5 rounded-lg border border-[#4A1616] text-xs font-bold cursor-pointer hover:bg-[#2A0F0F]">Tentar de novo</button>
        </div>
      ) : (
        <>
          {tab === 'painel' && <PainelMercados mercados={mercados} loadingMercados={loading} onCadastrar={() => irParaCadastro('novo')} onLancar={() => setTab('lancar')} notify={notify} />}
          {tab === 'vendas' && <VendasMercados mercados={mercados} onCadastrar={() => irParaCadastro('novo')} notify={notify} />}
          {tab === 'lancar' && (
            <LancarPedido
              mercados={mercados}
              loadingMercados={loading}
              pedidoId={editPedidoId}
              onDone={() => { setEditPedidoId(null); }}
              onCadastrar={irParaCadastro}
              notify={notify}
            />
          )}
          {tab === 'historico' && <HistoricoPedidos mercados={mercados} onEditar={editarPedido} notify={notify} />}
          {tab === 'cadastro' && <CadastroMercados mercados={mercados} loading={loading} foco={cadastroFoco} onChanged={recarregarMercados} notify={notify} />}
        </>
      )}

      {toast && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-[60]">
          <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border shadow-2xl text-sm ${
            toast.tipo === 'ok' ? 'bg-[#0F1F14] border-[#166534] text-[#86EFAC]' : 'bg-[#1F0B0B] border-[#4A1616] text-red-300'
          }`}>
            {toast.tipo === 'ok' ? <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />}
            <span className="flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="shrink-0 cursor-pointer opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
