import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerInfo } from '../types';
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
  Star 
} from 'lucide-react';
import { WasabiTag, SubtleSushiDivider, SushiRollIcon } from './SushiIcons';

export default function CustomersLoyalty() {
  const { customers, setCustomers, visualConfig } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'config'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  // Loyalty Program Config state
  const [pointsPerOrder, setPointsPerOrder] = useState('10');
  const [pointsNeededForReward, setPointsNeededForReward] = useState('100');
  const [rewardValue, setRewardValue] = useState('25');
  const [rewardType, setRewardType] = useState<'fixed' | 'percentage'>('fixed');
  const [activeLoyalty, setActiveLoyalty] = useState(true);

  // Sanitize and filter customers
  const cleanCustomers = customers.filter(c => c.name && !/^[0-9a-zA-Z]{3,6}$/.test(c.name) && c.name.length > 2 && c.name !== "23413" && c.name !== "12312" && c.name !== "gdfg");

  const filteredCustomers = cleanCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Configurações do Programa de Fidelidade do Sushi Delivery atualizadas com sucesso!");
  };

  const handleResetPoints = (id: string, name: string) => {
    if (confirm(`Zerar os pontos de fidelidade do cliente "${name}"? Ele poderá iniciar a contagem novamente.`)) {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, loyaltyPoints: 0 } : c));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="luvia-customers-loyalty">
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
          <div className="bg-[#141210] p-4 rounded-xl border border-[#2A211A] shadow-xs flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Buscar clientes por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs input-sushi focus:outline-none transition-all font-medium"
              />
            </div>

            <div className="text-xs font-mono text-[#A8A29A]">
              Clientes VIP Ativos: <span className="text-[#FB923C] font-bold">{cleanCustomers.length}</span>
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
                      <td colSpan={6} className="py-12 text-center text-[#A8A29A]">
                        Nenhum cliente encontrado com este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => {
                      const progressPercent = Math.min(100, (cust.loyaltyPoints / parseFloat(pointsNeededForReward)) * 100);
                      const canRedeem = cust.loyaltyPoints >= parseFloat(pointsNeededForReward);

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
                                  onClick={() => handleResetPoints(cust.id, cust.name)}
                                  className="px-2.5 py-1 bg-[#F97316]/20 border border-[#F97316]/40 text-[#FB923C] hover:bg-[#F97316] hover:text-white transition-all rounded-lg text-[10px] font-bold cursor-pointer"
                                  title="Resgatar Prêmio e zerar pontos"
                                >
                                  Resgatar Prêmio
                                </button>
                              )}

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
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Valor do Desconto Concedido</label>
                <input
                  type="number"
                  value={rewardValue}
                  onChange={(e) => setRewardValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="p-4 bg-[#181512] rounded-xl border border-[#2A211A] text-xs text-[#A8A29A]">
              <p>
                <strong className="text-[#F5F0EA]">Exemplo de Experiência:</strong> A cada R$ 100 em compras de sushi, o cliente acumula {parseFloat(pointsPerOrder) * 10} pontos. Atingindo a meta de {pointsNeededForReward} pontos, ele desbloqueia {rewardType === 'fixed' ? `R$ ${rewardValue}` : `${rewardValue}%`} de desconto no próximo pedido!
              </p>
            </div>

            <button
              type="submit"
              className="px-6 py-3 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer"
            >
              Salvar Regras do Clube
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
