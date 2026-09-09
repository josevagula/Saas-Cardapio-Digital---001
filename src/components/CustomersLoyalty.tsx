import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerInfo, LoyaltyConfig } from '../types';
import { DEFAULT_LOYALTY_CONFIG } from '../data/mockData';
import { hasUnlockedReward } from '../utils/loyalty';
import { LoyaltyLedgerEntry } from '../lib/workspaceRepo';
import {
  Users,
  Gift,
  Search,
  Award,
  MessageSquare,
  Check,
  Plus,
  Settings,
  Zap,
  TrendingUp,
  Star,
  History,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { WasabiTag, SubtleSushiDivider, SushiRollIcon } from './SushiIcons';

export default function CustomersLoyalty() {
  const { customers, products, categories, visualConfig, setVisualConfig, redeemReward, fetchCustomerLoyaltyHistory } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'config'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  // Redemption is in-flight/feedback state per customer id — a customer
  // mid-redemption keeps its button disabled so a double-click can never
  // fire two redeem requests for the same reward.
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemFeedback, setRedeemFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerInfo | null>(null);
  const [historyEntries, setHistoryEntries] = useState<LoyaltyLedgerEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Loyalty Program Config — mirrors visualConfig.loyaltyConfig (the value
  // that actually drives points earned per order, see AppContext.createOrder)
  // in local editable state so the form has something to bind inputs to
  // before "Salvar Regras do Clube" persists it.
  const savedLoyaltyConfig = visualConfig.loyaltyConfig ?? DEFAULT_LOYALTY_CONFIG;
  const [pointsPerOrder, setPointsPerOrder] = useState(String(savedLoyaltyConfig.pointsPerTenReais));
  const [pointsNeededForReward, setPointsNeededForReward] = useState(String(savedLoyaltyConfig.pointsNeededForReward));
  const [rewardValue, setRewardValue] = useState(String(savedLoyaltyConfig.rewardValue));
  const [rewardType, setRewardType] = useState<'fixed' | 'percentage' | 'product'>(savedLoyaltyConfig.rewardType);
  const [rewardProductId, setRewardProductId] = useState(savedLoyaltyConfig.rewardProductId ?? '');
  const [activeLoyalty, setActiveLoyalty] = useState(savedLoyaltyConfig.active);
  const [justSaved, setJustSaved] = useState(false);

  // Only customers with at least one completed (delivered) order belong in
  // the loyalty club list — orderCount only increments on delivery (see
  // creditOrderLoyalty), so this deliberately excludes someone who merely
  // placed an order that's still pending/cancelled. Also filters out a
  // short list of exact known test-data names — deliberately NOT a
  // "3-6 alphanumeric characters" pattern anymore, since that also matched
  // (and hid) plenty of real short names like "Bod".
  const cleanCustomers = customers.filter(c => c.name && c.name.length > 2 && c.name !== "23413" && c.name !== "12312" && c.name !== "gdfg" && c.orderCount > 0);

  const filteredCustomers = cleanCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: LoyaltyConfig = {
      active: activeLoyalty,
      pointsPerTenReais: parseFloat(pointsPerOrder) || 0,
      pointsNeededForReward: parseFloat(pointsNeededForReward) || 0,
      rewardType,
      rewardValue: parseFloat(rewardValue) || 0,
      ...(rewardType === 'product' ? { rewardProductId } : {})
    };
    setVisualConfig(prev => ({ ...prev, loyaltyConfig: newConfig }));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 4000);
  };

  // Spends exactly the configured goal, never the whole balance — a
  // customer with points beyond the goal keeps the remainder toward their
  // next reward. redeemingId disables the button for this one customer
  // while the request is in flight, so a double-click can't fire twice.
  const handleRedeem = async (cust: CustomerInfo) => {
    if (redeemingId) return;
    if (!confirm(`Confirmar o resgate do prêmio para "${cust.name}"?`)) return;
    setRedeemingId(cust.id);
    setRedeemFeedback(null);
    const result = await redeemReward(cust.phone);
    setRedeemingId(null);
    setRedeemFeedback({ id: cust.id, success: result.success, message: result.message });
    setTimeout(() => setRedeemFeedback(prev => (prev?.id === cust.id ? null : prev)), 5000);
  };

  const handleOpenHistory = async (cust: CustomerInfo) => {
    setHistoryCustomer(cust);
    setHistoryLoading(true);
    setHistoryEntries(await fetchCustomerLoyaltyHistory(cust.phone));
    setHistoryLoading(false);
  };

  // Groups the product picker by category, in category order, with each
  // group internally ordered the same way the cardápio itself sorts
  // products within that category (categoryDisplayOrder). A product in
  // multiple categories intentionally shows up under each one, same as on
  // the public menu.
  const productsByCategory = categories.map(cat => ({
    category: cat,
    products: products
      .filter(p => p.categoryIds.includes(cat.id))
      .sort((a, b) => {
        const orderA = a.categoryDisplayOrder?.[cat.id] ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.categoryDisplayOrder?.[cat.id] ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return products.indexOf(a) - products.indexOf(b);
      })
  })).filter(group => group.products.length > 0);

  const ledgerTypeLabel: Record<LoyaltyLedgerEntry['type'], string> = {
    earn: 'Pontos ganhos',
    reversal: 'Estorno',
    redeem: 'Resgate de prêmio'
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-customers-loyalty">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-widest">Retenção de Clientes</span>
            <WasabiTag text="Clube Sushi VIP" />
          </div>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight">Clientes & Fidelidade</h2>
          <p className="text-xs text-[#A8A29A] mt-1">Estimule a recorrência de pedidos de sushi, crie prêmios por pontos e gerencie a base VIP.</p>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex bg-[#141210] p-1 rounded-xl border border-[#2A211A] shadow-xs self-start">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'list' 
                ? 'btn-sushi-primary text-white shadow-xs' 
                : 'text-[#A8A29A] hover:text-[#F5F0EA]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lista de Clientes ({cleanCustomers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'config' 
                ? 'btn-sushi-primary text-white shadow-xs' 
                : 'text-[#A8A29A] hover:text-[#F5F0EA]'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Configuração de Prêmios</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'list' ? (
        <>
          {/* Customers Filter */}
          <div className="bg-[#141210] p-4 rounded-xl border border-[#2A211A] shadow-xs mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar clientes por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs input-sushi focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Customers List Grid */}
          <div className="bg-[#141210] rounded-2xl border border-[#2A211A] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#181512] border-b border-[#2A211A] text-[#A8A29A] font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3.5 px-6 font-bold">Cliente</th>
                    <th className="py-3.5 px-6 font-bold">Contato</th>
                    <th className="py-3.5 px-6 font-bold">Último Pedido</th>
                    <th className="py-3.5 px-6 font-bold text-center">Pedidos</th>
                    <th className="py-3.5 px-6 font-bold text-right">Pontos Ativos</th>
                    <th className="py-3.5 px-6 font-bold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A211A]">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-left sm:text-center text-[#A8A29A]">
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => {
                      const goal = savedLoyaltyConfig.pointsNeededForReward;
                      const progressPercent = goal > 0 ? Math.min(100, (cust.loyaltyPoints / goal) * 100) : 0;
                      const canRedeem = hasUnlockedReward(cust.loyaltyPoints, savedLoyaltyConfig);
                      const isRedeeming = redeemingId === cust.id;
                      const feedback = redeemFeedback?.id === cust.id ? redeemFeedback : null;

                      return (
                        <tr key={cust.id} className="hover:bg-[#181512] transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#1F1209] text-[#FB923C] flex items-center justify-center font-display font-extrabold text-xs uppercase border border-[#4A2A10]">
                                {cust.name.slice(0, 2)}
                              </div>
                              <div>
                                <h4 className="font-bold text-[#F5F0EA] text-xs">{cust.name}</h4>
                                <p className="text-[11px] text-[#A8A29A] max-w-xs truncate">{cust.address || "Sem endereço salvo"}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <p className="text-slate-200 font-semibold font-mono text-xs">{cust.phone}</p>
                            <p className="text-[11px] text-[#A8A29A]">{cust.email}</p>
                          </td>

                          <td className="py-4 px-6">
                            <span className="text-[#A8A29A] font-mono text-xs">{cust.lastOrderDate}</span>
                          </td>

                          <td className="py-4 px-6 text-center font-bold text-[#F5F0EA] font-mono">
                            {cust.orderCount}
                          </td>

                          <td className="py-4 px-6 text-right">
                            <div className="inline-flex flex-col items-end">
                              <span className={`font-mono font-extrabold text-xs ${canRedeem ? 'text-[#F97316]' : 'text-[#FB923C]'}`}>
                                {cust.loyaltyPoints} pts
                              </span>
                              <div className="w-24 h-1.5 bg-[#0C0A08] rounded-full mt-1.5 overflow-hidden border border-[#2A211A]">
                                <div 
                                  className={`h-full transition-all rounded-full ${canRedeem ? 'bg-[#F97316]' : 'bg-gradient-to-r from-[#C2410C] to-[#F97316]'}`}
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {canRedeem && (
                                <button
                                  onClick={() => handleRedeem(cust)}
                                  disabled={isRedeeming}
                                  className="px-2.5 py-1 bg-[#F97316]/20 border border-[#F97316]/40 text-[#FB923C] hover:bg-[#F97316] hover:text-white transition-all rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1"
                                  title={`Resgatar prêmio (-${goal} pontos)`}
                                >
                                  {isRedeeming && <Loader2 className="w-3 h-3 animate-spin" />}
                                  <span>Resgatar Prêmio</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenHistory(cust)}
                                className="p-1.5 bg-[#181512] text-[#FB923C] hover:bg-[#1F1209] rounded-lg border border-[#2A211A] transition-colors cursor-pointer"
                                title="Ver histórico de pontos"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>

                              <a
                                href={`https://wa.me/55${cust.phone.replace(/\D/g, '')}?text=Ol%C3%A1%20${encodeURIComponent(cust.name)}!%20Temos%20novidades%20deliciosas%20de%20sushi%20no%20${encodeURIComponent(visualConfig.establishmentName)}.`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-[#181512] text-[#FB923C] hover:bg-[#1F1209] rounded-lg border border-[#2A211A] transition-colors cursor-pointer"
                                title="Enviar mensagem no WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            </div>
                            {feedback && (
                              <p className={`mt-1.5 text-[10px] font-semibold ${feedback.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {feedback.message}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <SubtleSushiDivider />
        </>
      ) : (
        /* Config Settings Panel */
        <div className="bg-[#141210] p-7 rounded-2xl border border-[#2A211A] shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#2A211A] pb-4">
            <div>
              <h3 className="text-base font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
                <SushiRollIcon className="text-[#FB923C] w-5 h-5" />
                Regras do Clube Fidelidade Sushi
              </h3>
              <p className="text-xs text-[#A8A29A] mt-1">Configure como os clientes acumulam pontos a cada combo de sushi pedido.</p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={activeLoyalty} 
                onChange={(e) => setActiveLoyalty(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-[#0C0A08] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
            </label>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Pontos gerados por R$ 10,00 consumidos</label>
                <input
                  type="number"
                  value={pointsPerOrder}
                  onChange={(e) => setPointsPerOrder(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Meta de Pontos para Resgate de Prêmio</label>
                <input
                  type="number"
                  value={pointsNeededForReward}
                  onChange={(e) => setPointsNeededForReward(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tipo do Prêmio de Fidelidade</label>
                <select
                  value={rewardType}
                  onChange={(e: any) => setRewardType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none"
                >
                  <option value="fixed" className="bg-[#141210]">Desconto Fixo em Reais (R$)</option>
                  <option value="percentage" className="bg-[#141210]">Desconto Percentual (%)</option>
                  <option value="product" className="bg-[#141210]">Produto Grátis</option>
                </select>
              </div>

              {rewardType === 'product' ? (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Produto Concedido</label>
                  <select
                    value={rewardProductId}
                    onChange={(e) => setRewardProductId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none"
                  >
                    <option value="" className="bg-[#141210]">Selecione um produto...</option>
                    {productsByCategory.map(group => (
                      <optgroup key={group.category.id} label={group.category.name} className="bg-[#141210]">
                        {group.products.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#141210]">{p.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Valor do Desconto Concedido</label>
                  <input
                    type="number"
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-4 bg-[#181512] rounded-xl border border-[#2A211A] text-xs text-[#A8A29A]">
              <p>
                <strong className="text-[#F5F0EA]">Exemplo de Experiência:</strong> A cada R$ 100 em compras de sushi, o cliente acumula {parseFloat(pointsPerOrder) * 10} pontos. Atingindo a meta de {pointsNeededForReward} pontos, ele desbloqueia {
                  rewardType === 'fixed' ? `R$ ${rewardValue} de desconto`
                  : rewardType === 'percentage' ? `${rewardValue}% de desconto`
                  : `${products.find(p => p.id === rewardProductId)?.name ?? 'um produto'} grátis`
                } no próximo pedido!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-3 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Salvar Regras do Clube
              </button>
              {justSaved && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-400">
                  <Check className="w-4 h-4" />
                  Regras salvas com sucesso!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Histórico de Pontos — every earn/reversal/redeem for one customer,
          fetched on demand from the loyalty ledger rather than kept in
          memory for the whole list. */}
      {historyCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-lg shadow-2xl p-6 text-slate-100 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2A211A] shrink-0">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#FB923C]" />
                <div>
                  <h3 className="text-base font-display font-extrabold text-[#F5F0EA]">Histórico de Pontos</h3>
                  <p className="text-[11px] text-[#A8A29A]">{historyCustomer.name} · {historyCustomer.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryCustomer(null)}
                className="p-1.5 rounded-lg text-[#A8A29A] hover:text-white hover:bg-[#181512] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-2">
              {historyLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-[#A8A29A] text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando histórico...
                </div>
              ) : historyEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#A8A29A] text-xs text-center">
                  <AlertCircle className="w-5 h-5" />
                  <span>Nenhuma movimentação de pontos registrada ainda para este cliente.</span>
                </div>
              ) : (
                historyEntries.map(entry => (
                  <div key={entry.id} className="p-3 rounded-xl bg-[#181512] border border-[#2A211A] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#F5F0EA]">{ledgerTypeLabel[entry.type]}</p>
                      <p className="text-[10px] text-[#A8A29A] font-mono">
                        {new Date(entry.createdAt).toLocaleString('pt-BR')}
                        {entry.orderId ? ` · Pedido ${entry.orderId}` : ''}
                      </p>
                      {entry.rewardSnapshot && (
                        <p className="text-[10px] text-[#FB923C] mt-0.5">{entry.rewardSnapshot.label}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-mono font-extrabold text-xs ${entry.pointsDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {entry.pointsDelta >= 0 ? '+' : ''}{entry.pointsDelta} pts
                      </p>
                      <p className="text-[10px] text-[#A8A29A] font-mono">{entry.balanceBefore} → {entry.balanceAfter}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
