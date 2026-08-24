import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { safeNumber, formatCurrency, parseCashAmount } from '../utils/formatters';
import { 
  Check, 
  Clock, 
  Truck, 
  ShoppingBag, 
  MessageSquare, 
  ChevronRight, 
  ExternalLink, 
  Phone, 
  AlertCircle,
  TrendingUp,
  X,
  Ban,
  Trash2
} from 'lucide-react';

export default function OrdersManager() {
  const { orders, updateOrderStatus, deleteOrder, visualConfig } = useApp();
  const [activeTab, setActiveTab] = useState<OrderStatus>('preparing');

  // Simulated WhatsApp State
  const [selectedOrderForWhats, setSelectedOrderForWhats] = useState<Order | null>(null);
  const [customWhatsText, setCustomWhatsText] = useState('');

  const tabs: { id: OrderStatus; label: string; icon: any; color: string; hoverColor: string }[] = [
    { id: 'preparing', label: 'Em Preparação', icon: TrendingUp, color: 'bg-blue-500 text-white', hoverColor: 'hover:bg-blue-600' },
    { id: 'dispatched', label: 'A Caminho', icon: Truck, color: 'bg-indigo-500 text-white', hoverColor: 'hover:bg-indigo-600' },
    { id: 'delivered', label: 'Concluídos', icon: Check, color: 'bg-[#F97316] text-white', hoverColor: 'hover:bg-[#EA580C]' },
    { id: 'cancelled', label: 'Cancelados', icon: Ban, color: 'bg-red-600 text-white', hoverColor: 'hover:bg-red-700' }
  ];

  // Orders received before this tab existed are legacy 'received' — treat them as part of "Em Preparação".
  const matchesTab = (order: Order, tabId: OrderStatus) =>
    tabId === 'preparing' ? (order.status === 'preparing' || order.status === 'received') : order.status === tabId;

  // Oldest first — a kitchen queue reads top to bottom in arrival order.
  const filteredOrders = orders
    .filter(o => matchesTab(o, activeTab))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // The sequential number is assigned in the background shortly after
  // checkout (see assignOrderNumber in AppContext), so it may briefly be
  // missing on a just-placed order — falls back to the legacy random id
  // (still relabelled LUV->PED) rather than showing a blank code.
  const formatOrderCode = (order: Order) =>
    order.orderNumber != null ? `PED-${String(order.orderNumber).padStart(4, '0')}` : order.id.replace('LUV', 'PED');

  // Generate Automated WhatsApp message based on current status
  const triggerWhatsAppSimulator = (order: Order) => {
    let text = `Olá, *${order.customerName}*! Seu pedido *${formatOrderCode(order)}* na *${visualConfig.establishmentName}* foi atualizado:\n\n`;
    
    if (order.status === 'received') {
      text += `✅ *Pedido Confirmado!* Já recebemos a sua solicitação no sistema e estamos analisando.\n`;
    } else if (order.status === 'preparing') {
      text += `👨‍🍳 *Em Preparação!* O chefe já está montando o seu pedido com muito capricho.\n`;
    } else if (order.status === 'dispatched') {
      text += `🛵 *Saiu para entrega!* Nosso entregador já está a caminho com seu pedido quentinho.\n`;
    } else if (order.status === 'delivered') {
      text += `🎉 *Entregue!* Esperamos que aproveite a refeição. Muito obrigado pela preferência!\n`;
    } else if (order.status === 'cancelled') {
      text += `❌ *Pedido Cancelado.* Seu pedido foi cancelado. Qualquer dúvida, fale com a gente.\n`;
    }

    text += `\n*Resumo do Pedido:*\n`;
    order.items.forEach(item => {
      const removedText = item.removedIngredients && item.removedIngredients.length > 0 ? ` [Sem: ${item.removedIngredients.join(', ')}]` : '';
      const extrasText = item.extras && item.extras.length > 0 ? ` [+ ${item.extras.map(ex => `${ex.quantity}x ${ex.name}`).join(', ')}]` : '';
      const notesText = item.notes ? ` (Obs: ${item.notes})` : '';
      text += `- ${item.quantity}x ${item.product.name}${removedText}${extrasText}${notesText}\n`;
    });

    text += `\n*Total:* R$ ${formatCurrency(order.total)}\n`;
    let paymentFormatted = order.paymentMethod.replace('_', ' ').toUpperCase();
    if (order.paymentMethod === 'cash') {
      if (order.needsChange) {
        const noteVal = parseCashAmount(order.changeAmount || '');
        const changeVal = noteVal > order.total ? noteVal - order.total : 0;
        const noteFormatted = noteVal > 0 ? `R$ ${noteVal.toFixed(2).replace('.', ',')}` : order.changeAmount;
        const changeFormatted = changeVal > 0 ? ` (Troco: R$ ${changeVal.toFixed(2).replace('.', ',')})` : '';
        paymentFormatted = `DINHEIRO - Para ${noteFormatted}${changeFormatted}`;
      } else {
        paymentFormatted = `DINHEIRO (Sem troco)`;
      }
    }
    text += `*Forma de Pagamento:* ${paymentFormatted}\n`;
    if (order.deliveryMethod === 'delivery') {
      text += `📍 *Endereço:* ${order.customerAddress || 'Não fornecido'}\n`;
    } else {
      text += `🏬 *Método:* Retirada no balcão\n`;
    }

    text += `\n📱 Acompanhe o status e fale com o atendimento em caso de dúvidas: ${window.location.origin}/menu`;

    setCustomWhatsText(text);
    setSelectedOrderForWhats(order);
  };

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === 'received') return 'preparing';
    if (current === 'preparing') return 'dispatched';
    if (current === 'dispatched') return 'delivered';
    return null;
  };

  const getStatusActionLabel = (current: OrderStatus): string => {
    if (current === 'received') return 'Aceitar e Preparar';
    if (current === 'preparing') return 'Despachar / Enviar';
    if (current === 'dispatched') return 'Marcar como Entregue';
    return '';
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-orders-manager">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">Painel Operacional</span>
          <h2 className="text-2xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-0.5">Gestão de Pedidos</h2>
          <p className="text-xs text-[#A8A29A] mt-0.5">Monitore e gerencie o fluxo de entrega, atualize status dos clientes e despache pedidos.</p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'cancelled' && filteredOrders.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Excluir todos os ${filteredOrders.length} pedidos cancelados? Essa ação não pode ser desfeita.`)) {
                  filteredOrders.forEach(o => deleteOrder(o.id));
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#4A1616] bg-[#1F0B0B] text-red-400 hover:bg-[#2A0F0F] hover:text-red-300 transition-colors cursor-pointer text-xs font-bold"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Excluir Todos os Cancelados</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 bg-[#141210] px-3.5 py-2 rounded-xl border border-[#2A211A] text-[10px] text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#FB923C] shrink-0" />
            <span>Fuso Local: Atendimento Ativo</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const count = orders.filter(o => matchesTab(o, tab.id)).length;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all text-left cursor-pointer min-w-0 ${
                isActive 
                  ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-950/40' 
                  : 'bg-[#141210] text-slate-300 border-[#2A211A] hover:border-[#3A2E24]'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-1">
                <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-[#181512] text-[#A8A29A] border border-[#2A211A]'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-display font-bold leading-tight whitespace-normal">
                    {tab.label}
                  </p>
                </div>
              </div>

              <span className={`inline-flex items-center justify-center px-2 py-0.5 min-w-[24px] h-6 rounded-full font-mono text-xs font-black leading-none shrink-0 transition-colors ${
                count === 0
                  ? isActive ? 'bg-white/20 text-white' : 'bg-[#181512] text-[#A8A29A]/70 border border-[#2A211A]'
                  : isActive ? 'bg-white text-[#C2410C] shadow-xs' : 'bg-[#181512] text-[#FB923C] border border-[#2A211A]'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-[#141210] p-12 text-center rounded-2xl border border-[#2A211A] shadow-sm">
          <ShoppingBag className="w-12 h-12 text-[#A8A29A]/50 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#F5F0EA]">Sem pedidos nesta coluna</h4>
          <p className="text-sm text-[#A8A29A] mt-1">Não há nenhum pedido no status selecionado no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map(order => {
            const nextStatus = getNextStatus(order.status);
            return (
              <div 
                key={order.id} 
                className="bg-[#141210] rounded-2xl border border-[#2A211A] shadow-sm hover:border-[#3A2E24] transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4 border-b border-[#2A211A] pb-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#FB923C]">{formatOrderCode(order)}</span>
                      <p className="text-sm font-semibold text-[#F5F0EA] mt-0.5 truncate">{order.customerName}</p>
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-300 bg-[#0C0A08] border border-[#2A211A] px-2 py-0.5 rounded-md">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs text-slate-300">
                        <div className="flex-1">
                          <span className="font-bold text-[#F97316] font-mono mr-1">{item.quantity}x</span>
                          <span className="font-medium text-slate-200">{item.product.name}</span>
                          {item.removedIngredients && item.removedIngredients.length > 0 && (
                            <p className="text-[10px] text-red-400 font-bold mt-0.5 ml-5 flex items-center gap-1">
                              <span>⛔ RETIRAR:</span>
                              <span className="line-through">{item.removedIngredients.join(', ')}</span>
                            </p>
                          )}
                          {item.extras && item.extras.length > 0 && (
                            <p className="text-[10px] text-emerald-400 font-bold mt-0.5 ml-5">
                              ➕ {item.extras.map(ex => `${ex.quantity}x ${ex.name}`).join(', ')}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-amber-300 italic mt-0.5 ml-5">"Obs: {item.notes}"</p>
                          )}
                        </div>
                        <span className="font-mono text-[#A8A29A]">
                          R$ {formatCurrency(safeNumber(item.product.promoPrice || item.product.price) * item.quantity + (item.extras || []).reduce((s, ex) => s + safeNumber(ex.price) * safeNumber(ex.quantity), 0))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment and Delivery Mode */}
                  <div className="space-y-1.5 border-t border-[#2A211A] pt-3 text-[11px] text-[#A8A29A] font-mono">
                    <div className="flex justify-between">
                      <span>
                        Forma: {(() => {
                          if (order.paymentMethod !== 'cash') return order.paymentMethod.replace('_', ' ').toUpperCase();
                          if (!order.needsChange) return 'DINHEIRO (Sem troco)';
                          const noteVal = parseCashAmount(order.changeAmount || '');
                          const changeVal = noteVal > order.total ? noteVal - order.total : 0;
                          const noteFormatted = noteVal > 0 ? `R$ ${noteVal.toFixed(2).replace('.', ',')}` : order.changeAmount;
                          const changeFormatted = changeVal > 0 ? ` [Troco: R$ ${changeVal.toFixed(2).replace('.', ',')}]` : '';
                          return `DINHEIRO (Para ${noteFormatted}${changeFormatted})`;
                        })()}
                      </span>
                      <span className="text-[#FB923C] font-semibold">{order.deliveryMethod === 'pickup' ? 'RETIRADA NO LOCAL' : order.deliveryMethod.toUpperCase()}</span>
                    </div>
                    {order.deliveryMethod === 'delivery' && (
                      <div className="text-slate-300 truncate mt-1">
                        📍 {order.customerAddress}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-[#181512] border-t border-[#2A211A] flex items-center justify-between gap-3">
                  <div className="font-mono text-xs">
                    <span className="text-[#A8A29A]">Total:</span>
                    <p className="text-sm font-extrabold text-[#F5F0EA]">R$ {formatCurrency(order.total)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Cancelar o pedido ${formatOrderCode(order)}? Ele vai para a coluna "Cancelados" e a ação não pode ser desfeita.`)) {
                            updateOrderStatus(order.id, 'cancelled');
                          }
                        }}
                        className="p-2 rounded-lg bg-[#1F0B0B] text-red-400 border border-[#4A1616] hover:bg-[#2A0F0F] hover:text-red-300 transition-colors cursor-pointer"
                        title="Cancelar Pedido"
                      >
                        <Ban className="w-4.5 h-4.5" />
                      </button>
                    )}

                    {order.status === 'cancelled' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir o pedido ${formatOrderCode(order)}? Essa ação não pode ser desfeita.`)) {
                            deleteOrder(order.id);
                          }
                        }}
                        className="p-2 rounded-lg bg-[#1F0B0B] text-red-400 border border-[#4A1616] hover:bg-[#2A0F0F] hover:text-red-300 transition-colors cursor-pointer"
                        title="Excluir Pedido"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}

                    <button
                      onClick={() => triggerWhatsAppSimulator(order)}
                      className="p-2 rounded-lg bg-[#1F1209] text-[#F97316] border border-[#4A2A10] hover:bg-[#2A180C] transition-colors cursor-pointer"
                      title="Enviar Status WhatsApp"
                    >
                      <MessageSquare className="w-4.5 h-4.5" />
                    </button>

                    {nextStatus && (
                      <button
                        onClick={() => updateOrderStatus(order.id, nextStatus)}
                        className="flex items-center gap-1 px-3.5 py-1.5 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer"
                      >
                        <span>{getStatusActionLabel(order.status)}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WHATSAPP AUTOMATION SIMULATOR DIALOG */}
      {selectedOrderForWhats && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-100">
            <div className="p-5 border-b border-[#2A211A] flex items-center justify-between bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 fill-white" />
                <div>
                  <h3 className="font-display font-bold">Simulador de WhatsApp Sushi</h3>
                  <p className="text-[10px] text-orange-100 font-mono uppercase tracking-wider">Mapeamento de Automação de Status</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrderForWhats(null)}
                className="p-1 rounded-lg text-orange-100 hover:bg-orange-700/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#1F1209] p-3 rounded-xl border border-[#4A2A10]">
                <AlertCircle className="w-4.5 h-4.5 text-[#FB923C] shrink-0" />
                <span>
                  O sistema Sushi dispara webhooks integrados com a API do WhatsApp Business oficial do estabelecimento para atualizar o cliente instantaneamente.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Destinatário Celular</label>
                <div className="flex items-center gap-2 bg-[#181512] px-3 py-2 rounded-lg text-slate-200 border border-[#2A211A] text-sm font-mono">
                  <Phone className="w-3.5 h-3.5 text-[#FB923C]" />
                  <span>{selectedOrderForWhats.customerPhone} ({selectedOrderForWhats.customerName})</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Conteúdo da Mensagem Automatizada</label>
                <textarea
                  rows={8}
                  value={customWhatsText}
                  onChange={(e) => setCustomWhatsText(e.target.value)}
                  className="w-full px-3.5 py-3 text-xs input-sushi focus:outline-none font-mono leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-[#181512] border-t border-[#2A211A] flex gap-2 justify-end">
              <button
                onClick={() => setSelectedOrderForWhats(null)}
                className="px-4 py-2 bg-[#141210] hover:bg-[#2A211A] text-slate-300 text-xs font-semibold rounded-lg border border-[#2A211A] transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={() => {
                  alert("Notificação enviada com sucesso no simulador Sushi!");
                  setSelectedOrderForWhats(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <span>Enviar Notificação</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
