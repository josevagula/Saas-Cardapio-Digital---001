import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageTemplates } from '../types';
import { DEFAULT_MESSAGE_TEMPLATES, getMessageTemplates } from '../utils/messageTemplates';
import { MessageSquare, X, RotateCcw, Check } from 'lucide-react';

const FIELDS: { key: keyof MessageTemplates; label: string; hint: string; group: string }[] = [
  { key: 'customerContact', label: 'Mensagem para clientes', hint: 'Botão de WhatsApp em Clientes & Fidelidade.', group: 'Clientes & Fidelidade' },
  { key: 'orderReceived', label: 'Pedido recebido', hint: 'Enviada quando o pedido está como recebido.', group: 'Atualização de pedidos' },
  { key: 'orderPreparing', label: 'Em preparação', hint: 'Enviada quando o pedido está em preparação.', group: 'Atualização de pedidos' },
  { key: 'orderDispatched', label: 'Saiu para entrega', hint: 'Enviada quando o pedido foi despachado.', group: 'Atualização de pedidos' },
  { key: 'orderDelivered', label: 'Entregue', hint: 'Enviada quando o pedido foi concluído.', group: 'Atualização de pedidos' },
  { key: 'orderCancelled', label: 'Cancelado', hint: 'Enviada quando o pedido foi cancelado.', group: 'Atualização de pedidos' }
];

// Editor for every WhatsApp text the panel sends to customers. Saved into
// visualConfig.messageTemplates (persisted like loyaltyConfig).
export default function MessageTemplatesModal({ onClose }: { onClose: () => void }) {
  const { visualConfig, setVisualConfig } = useApp();
  const [draft, setDraft] = useState<MessageTemplates>(() => getMessageTemplates(visualConfig));
  const [justSaved, setJustSaved] = useState(false);

  const handleSave = () => {
    setVisualConfig(prev => ({ ...prev, messageTemplates: draft }));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-2xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#2A211A] shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#FB923C]" />
            <div>
              <h3 className="text-base font-display font-extrabold text-[#F5F0EA]">Mensagens para Clientes</h3>
              <p className="text-[11px] text-[#A8A29A]">Edite os textos enviados pelo WhatsApp.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#A8A29A] hover:text-white hover:bg-[#181512] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <div className="p-3 bg-[#1F1209] rounded-xl border border-[#4A2A10] text-[11px] text-slate-300 leading-relaxed">
            Use as variáveis <code className="text-[#FB923C]">{'{nome}'}</code> (nome do cliente),{' '}
            <code className="text-[#FB923C]">{'{restaurante}'}</code> (nome do estabelecimento) e{' '}
            <code className="text-[#FB923C]">{'{pedido}'}</code> (código do pedido, só nas mensagens de pedido).
            Use <code className="text-[#FB923C]">*texto*</code> para negrito no WhatsApp. Nas mensagens de pedido, o resumo (itens, total, pagamento e endereço) continua sendo adicionado automaticamente no final.
          </div>

          {FIELDS.map(field => {
            const showGroup = field.group !== lastGroup;
            lastGroup = field.group;
            return (
              <React.Fragment key={field.key}>
                {showGroup && (
                  <p className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest pt-2">{field.group}</p>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <label className="text-xs font-semibold text-slate-300">
                      {field.label} <span className="text-[10px] font-normal text-[#A8A29A]">— {field.hint}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, [field.key]: DEFAULT_MESSAGE_TEMPLATES[field.key] }))}
                      className="flex items-center gap-1 text-[10px] font-bold text-[#A8A29A] hover:text-[#FB923C] cursor-pointer shrink-0"
                      title="Voltar ao texto padrão"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Padrão
                    </button>
                  </div>
                  <textarea
                    rows={field.key === 'customerContact' ? 3 : 4}
                    value={draft[field.key]}
                    onChange={(e) => setDraft(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs input-sushi focus:outline-none leading-relaxed resize-y"
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="p-4 bg-[#181512] border-t border-[#2A211A] flex items-center gap-3 justify-end shrink-0 rounded-b-2xl">
          {justSaved && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 mr-auto">
              <Check className="w-4 h-4" />
              Mensagens salvas!
            </span>
          )}
          <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer">
            Fechar
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer">
            Salvar Mensagens
          </button>
        </div>
      </div>
    </div>
  );
}
