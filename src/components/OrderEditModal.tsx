import React, { useMemo, useState } from 'react';
import { X, Plus, Minus, Trash2, Pencil, Save, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DeliveryMethod, Order, OrderItem, PaymentMethod, Product, SelectedExtra } from '../types';
import { computeCartTotals, formatCurrency, formatOrderCode, getUnitPrice, lineTotal, safeNumber } from '../utils/formatters';

// Admin-only "Editar Pedido". Lives inside OrdersManager (the logged-in
// admin panel), never on the public menu. AppContext.updateOrder refuses
// archived/cancelled orders as a second guard.

type EditableLine = OrderItem & { _key: string };

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' }
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: 'delivery', label: 'Entrega' },
  { value: 'pickup', label: 'Retirada no local' },
  { value: 'dine_in', label: 'Consumo no local' }
];

let keySeq = 0;
const nextKey = () => `line-${Date.now()}-${keySeq++}`;

// Same as checkout: embedded base64 photos make each line huge and no
// order screen/receipt shows them.
const productSnapshot = (p: Product): Product => (p.imageUrl?.startsWith('data:') ? { ...p, imageUrl: '' } : p);

export default function OrderEditModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { products, coupons, updateOrder } = useApp();

  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  const [customerAddress, setCustomerAddress] = useState(order.customerAddress || '');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(order.deliveryMethod);
  const [deliveryFee, setDeliveryFee] = useState(String(safeNumber(order.deliveryFee)).replace('.', ','));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.paymentMethod);
  const [needsChange, setNeedsChange] = useState(!!order.needsChange);
  const [changeAmount, setChangeAmount] = useState(order.changeAmount || '');
  const [notes, setNotes] = useState(order.notes || '');
  const [lines, setLines] = useState<EditableLine[]>(() => order.items.map(i => ({ ...i, _key: nextKey() })));
  const [addProductId, setAddProductId] = useState('');
  const [error, setError] = useState('');

  const menuProducts = useMemo(
    () => products.filter(p => !p.deletedAt).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [products]
  );

  const feeValue = deliveryMethod === 'delivery' ? Math.max(0, safeNumber(deliveryFee.replace(',', '.'))) : 0;

  // A coupon still in the list is re-applied to the new subtotal (so a
  // percentage coupon follows the edit); otherwise the original discount
  // amount is kept as a fixed value.
  const couponForTotals = useMemo(() => {
    if (order.couponCode) {
      const c = coupons.find(cp => cp.code.toUpperCase() === order.couponCode!.toUpperCase());
      if (c) return c;
    }
    return order.discountAmount > 0 ? { discountType: 'fixed', value: order.discountAmount } : null;
  }, [coupons, order.couponCode, order.discountAmount]);

  const totals = computeCartTotals(lines, feeValue, couponForTotals);

  const updateLine = (key: string, patch: Partial<OrderItem>) =>
    setLines(prev => prev.map(l => (l._key === key ? { ...l, ...patch } : l)));

  const changeLineProduct = (key: string, productId: string) => {
    const p = products.find(pr => pr.id === productId);
    if (!p) return;
    // A different product starts clean: its add-ons, flavors and removed
    // ingredients belonged to the old one.
    setLines(prev => prev.map(l => (l._key === key
      ? { _key: l._key, product: productSnapshot(p), quantity: l.quantity, notes: l.notes }
      : l)));
  };

  // Add-ons on offer for a line: the product's current configuration, plus
  // any add-on the order already has that's no longer configured.
  const extrasForLine = (line: EditableLine) => {
    const current = products.find(p => p.id === line.product.id)?.extras ?? line.product.extras ?? [];
    const list = current.map(ex => ({ id: ex.id, name: ex.name, price: safeNumber(ex.price), maxQuantity: safeNumber(ex.maxQuantity, 10) || 10 }));
    (line.extras || []).forEach(sel => {
      if (!list.some(ex => ex.id === sel.id)) list.push({ id: sel.id, name: sel.name, price: safeNumber(sel.price), maxQuantity: Math.max(10, sel.quantity) });
    });
    return list;
  };

  const setExtraQty = (line: EditableLine, extra: { id: string; name: string; price: number; maxQuantity: number }, qty: number) => {
    const q = Math.max(0, Math.min(extra.maxQuantity, qty));
    const existing = line.extras || [];
    const already = existing.find(e => e.id === extra.id);
    let next: SelectedExtra[];
    if (q === 0) next = existing.filter(e => e.id !== extra.id);
    else if (already) next = existing.map(e => (e.id === extra.id ? { ...e, quantity: q } : e));
    else next = [...existing, { id: extra.id, name: extra.name, price: extra.price, quantity: q }];
    updateLine(line._key, { extras: next });
  };

  const toggleIngredient = (line: EditableLine, ing: string) => {
    const removed = line.removedIngredients || [];
    updateLine(line._key, {
      removedIngredients: removed.includes(ing) ? removed.filter(r => r !== ing) : [...removed, ing]
    });
  };

  const addLine = () => {
    const p = products.find(pr => pr.id === addProductId);
    if (!p) return;
    setLines(prev => [...prev, { _key: nextKey(), product: productSnapshot(p), quantity: 1 }]);
    setAddProductId('');
  };

  const handleSave = () => {
    setError('');
    if (!customerName.trim()) return setError('Informe o nome do cliente.');
    if (lines.length === 0) return setError('O pedido precisa ter pelo menos um item.');
    if (deliveryMethod === 'delivery' && !customerAddress.trim()) return setError('Informe o endereço de entrega.');

    const items: OrderItem[] = lines.map(({ _key, ...item }) => ({
      ...item,
      quantity: Math.max(1, Math.round(safeNumber(item.quantity, 1))),
      notes: item.notes?.trim() ? item.notes.trim() : undefined,
      extras: item.extras && item.extras.length > 0 ? item.extras : undefined,
      removedIngredients: item.removedIngredients && item.removedIngredients.length > 0 ? item.removedIngredients : undefined
    }));
    const isCash = paymentMethod === 'cash';
    const ok = updateOrder(order.id, {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: deliveryMethod === 'delivery' ? customerAddress.trim() : (customerAddress.trim() || undefined),
      deliveryMethod,
      paymentMethod,
      needsChange: isCash ? needsChange : undefined,
      changeAmount: isCash && needsChange ? changeAmount.trim() : undefined,
      notes: notes.trim() || undefined,
      items,
      deliveryFee: totals.deliveryFee,
      discountAmount: totals.discountAmount,
      total: totals.total
    });
    if (!ok) return setError('Este pedido não pode mais ser editado (arquivado ou cancelado).');
    onClose();
  };

  const labelCls = 'text-[11px] font-semibold text-slate-300 block mb-1';
  const inputCls = 'w-full px-3 py-2 text-sm input-sushi focus:outline-none';
  const smallBtn = 'p-1.5 rounded-lg bg-[#141210] text-slate-300 border border-[#2A211A] hover:bg-[#2A211A] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        <div className="p-4 sm:p-5 border-b border-[#2A211A] flex items-center justify-between bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Pencil className="w-5 h-5" />
            <div>
              <h3 className="font-display font-bold">Editar Pedido {formatOrderCode(order)}</h3>
              <p className="text-[10px] text-orange-100 font-mono uppercase tracking-wider">Somente administrador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-orange-100 hover:bg-orange-700/50 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Cliente */}
          <section className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-widest">Cliente</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nome</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className={inputCls} />
              </div>
            </div>
          </section>

          {/* Itens */}
          <section className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-widest">Itens</h4>
            {lines.map(line => {
              const inMenu = menuProducts.some(p => p.id === line.product.id);
              const extras = extrasForLine(line);
              const ingredients = line.product.ingredients || [];
              return (
                <div key={line._key} className="bg-[#181512] border border-[#2A211A] rounded-xl p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1 min-w-0">
                      <label className={labelCls}>Produto</label>
                      <select value={line.product.id} onChange={e => changeLineProduct(line._key, e.target.value)} className={inputCls}>
                        {!inMenu && <option value={line.product.id}>{line.product.name} (fora do cardápio)</option>}
                        {menuProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — R$ {formatCurrency(getUnitPrice(p))}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <label className={labelCls}>Qtd.</label>
                        <div className="flex items-center gap-1">
                          <button className={smallBtn} disabled={line.quantity <= 1} onClick={() => updateLine(line._key, { quantity: Math.max(1, line.quantity - 1) })}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold">{line.quantity}</span>
                          <button className={smallBtn} onClick={() => updateLine(line._key, { quantity: line.quantity + 1 })}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <button
                        className="p-2 mt-5 rounded-lg bg-[#1F0B0B] text-red-400 border border-[#4A1616] hover:bg-[#2A0F0F] transition-colors cursor-pointer"
                        title="Remover item"
                        onClick={() => setLines(prev => prev.filter(l => l._key !== line._key))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {line.comboFlavors && line.comboFlavors.length > 0 && (
                    <p className="text-[11px] text-[#FB923C]">🍣 Sabores: {line.comboFlavors.map(f => `${f.pieces}x ${f.flavorName}`).join(', ')}</p>
                  )}
                  {line.halfAndHalf && (
                    <p className="text-[11px] text-[#FB923C]">🍣 Meio a Meio: {line.halfAndHalf.flavor1} / {line.halfAndHalf.flavor2}</p>
                  )}

                  {extras.length > 0 && (
                    <div>
                      <label className={labelCls}>Adicionais</label>
                      <div className="space-y-1.5">
                        {extras.map(ex => {
                          const qty = line.extras?.find(e => e.id === ex.id)?.quantity ?? 0;
                          return (
                            <div key={ex.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-slate-300 min-w-0 truncate">{ex.name} <span className="text-[#A8A29A] font-mono">+R$ {formatCurrency(ex.price)}</span></span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button className={smallBtn} disabled={qty <= 0} onClick={() => setExtraQty(line, ex, qty - 1)}><Minus className="w-3 h-3" /></button>
                                <span className="w-6 text-center font-mono">{qty}</span>
                                <button className={smallBtn} disabled={qty >= ex.maxQuantity} onClick={() => setExtraQty(line, ex, qty + 1)}><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {ingredients.length > 0 && (
                    <div>
                      <label className={labelCls}>Retirar ingredientes</label>
                      <div className="flex flex-wrap gap-1.5">
                        {ingredients.map(ing => {
                          const removed = (line.removedIngredients || []).includes(ing);
                          return (
                            <button
                              key={ing}
                              onClick={() => toggleIngredient(line, ing)}
                              className={`px-2 py-1 rounded-md text-[11px] border cursor-pointer transition-colors ${removed ? 'bg-[#2A0F0F] border-red-500/60 text-red-300 line-through' : 'bg-[#141210] border-[#2A211A] text-slate-300 hover:border-[#3A2E24]'}`}
                            >
                              {ing}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <div className="flex-1">
                      <label className={labelCls}>Observação do item</label>
                      <input value={line.notes || ''} onChange={e => updateLine(line._key, { notes: e.target.value })} className={inputCls} placeholder="Ex.: sem cebolinha" />
                    </div>
                    <span className="font-mono text-sm text-[#F5F0EA] sm:pb-2 text-right">R$ {formatCurrency(lineTotal(line))}</span>
                  </div>
                </div>
              );
            })}

            <div className="flex flex-col sm:flex-row gap-2">
              <select value={addProductId} onChange={e => setAddProductId(e.target.value)} className={inputCls}>
                <option value="">Adicionar produto…</option>
                {menuProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} — R$ {formatCurrency(getUnitPrice(p))}</option>
                ))}
              </select>
              <button
                onClick={addLine}
                disabled={!addProductId}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[#4A2A10] bg-[#1F1209] text-[#F97316] hover:bg-[#2A180C] transition-colors cursor-pointer text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </section>

          {/* Entrega */}
          <section className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-widest">Entrega</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Modalidade</label>
                <select value={deliveryMethod} onChange={e => setDeliveryMethod(e.target.value as DeliveryMethod)} className={inputCls}>
                  {DELIVERY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {deliveryMethod === 'delivery' && (
                <div>
                  <label className={labelCls}>Taxa de entrega (R$)</label>
                  <input value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} inputMode="decimal" className={inputCls} />
                </div>
              )}
            </div>
            {deliveryMethod === 'delivery' && (
              <div>
                <label className={labelCls}>Endereço</label>
                <textarea rows={2} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className={`${inputCls} resize-none`} />
              </div>
            )}
          </section>

          {/* Pagamento */}
          <section className="space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-widest">Pagamento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Forma de pagamento</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} className={inputCls}>
                  {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {paymentMethod === 'cash' && (
                <div>
                  <label className={labelCls}>Troco</label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 shrink-0 cursor-pointer">
                      <input type="checkbox" checked={needsChange} onChange={e => setNeedsChange(e.target.checked)} />
                      Precisa de troco
                    </label>
                    {needsChange && (
                      <input value={changeAmount} onChange={e => setChangeAmount(e.target.value)} placeholder="Para quanto? Ex.: 100" className={inputCls} />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Observações do pedido</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
            </div>
          </section>

          {/* Totais */}
          <section className="bg-[#0C0A08] border border-[#2A211A] rounded-xl p-4 font-mono text-xs space-y-1">
            <div className="flex justify-between text-[#A8A29A]"><span>Subtotal:</span><span>R$ {formatCurrency(totals.subtotal)}</span></div>
            {totals.deliveryFee > 0 && <div className="flex justify-between text-[#A8A29A]"><span>Taxa:</span><span>R$ {formatCurrency(totals.deliveryFee)}</span></div>}
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-[#A8A29A]"><span>Desconto{order.couponCode ? ` (${order.couponCode})` : ''}:</span><span>- R$ {formatCurrency(totals.discountAmount)}</span></div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-[#A8A29A]">Total:</span>
              <span className="text-sm font-extrabold text-[#F5F0EA]">R$ {formatCurrency(totals.total)}</span>
            </div>
            {totals.total !== safeNumber(order.total) && (
              <p className="text-[10px] text-[#FB923C] pt-1">Total anterior: R$ {formatCurrency(order.total)}</p>
            )}
          </section>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-300 bg-[#1F0B0B] border border-[#4A1616] rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-[#181512] border-t border-[#2A211A] flex items-center gap-2 justify-end shrink-0">
          <div className="mr-auto font-mono leading-tight">
            <span className="text-[10px] text-[#A8A29A] block">Novo total</span>
            <span className="text-base font-extrabold text-[#F5F0EA]">R$ {formatCurrency(totals.total)}</span>
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-[#141210] hover:bg-[#2A211A] text-slate-300 text-xs font-semibold rounded-lg border border-[#2A211A] transition-colors cursor-pointer">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer">
            <Save className="w-3.5 h-3.5" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
}
