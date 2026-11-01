import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { safeNumber, formatCurrency, getUnitPrice } from '../utils/formatters';
import { buildComboImage } from '../utils/comboImage';
import { compressImage } from '../utils/imageUtils';
import { X, Search, Plus, Minus, Check, Loader2, Upload, RotateCcw, Layers } from 'lucide-react';

// "Combo Promocional" builder in Cardápio: pick items already on the menu,
// set a discount (or the final price), and it's saved as one product whose
// photo is the items' photos combined side by side — same as the combos
// activated from Sushi AI Studio. The undiscounted sum goes in Preço
// Promocional (shown struck through) and the discounted price is charged
// (see getUnitPrice).

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const round2 = (n: number) => Math.round(n * 100) / 100;
const brl = (n: number) => `R$ ${formatCurrency(n).replace('.', ',')}`;
const DESTAQUES_NEW = '__new_destaques__';

export default function ComboPromoModal({ onClose }: { onClose: () => void }) {
  const { products, categories, addProduct, addCategory } = useApp();

  const [search, setSearch] = useState('');
  // productId -> quantity, in the order they were picked.
  const [items, setItems] = useState<{ id: string; qty: number }[]>([]);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [discountInput, setDiscountInput] = useState('15');
  const [priceInput, setPriceInput] = useState('');
  // Which field the user last typed in drives the other one.
  const [priceMode, setPriceMode] = useState<'discount' | 'price'>('discount');

  const destaques = categories.find(c => ['destaques', 'destaque'].includes(normalize(c.name)));
  const [categoryIds, setCategoryIds] = useState<string[]>([destaques ? destaques.id : DESTAQUES_NEW]);

  const [autoImage, setAutoImage] = useState('');
  const [customImage, setCustomImage] = useState('');
  const [buildingImage, setBuildingImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => items
      .map(i => ({ product: products.find(p => p.id === i.id), qty: i.qty }))
      .filter((i): i is { product: Product; qty: number } => !!i.product),
    [items, products]
  );
  const totalQty = selected.reduce((s, i) => s + i.qty, 0);
  const original = round2(selected.reduce((s, i) => s + getUnitPrice(i.product) * i.qty, 0));

  const discountPct = priceMode === 'discount'
    ? Math.min(100, Math.max(0, safeNumber(discountInput.replace(',', '.'))))
    : original > 0 ? Math.max(0, round2((1 - safeNumber(priceInput.replace(',', '.')) / original) * 100)) : 0;
  const finalPrice = priceMode === 'discount'
    ? round2(original * (1 - discountPct / 100))
    : round2(safeNumber(priceInput.replace(',', '.')));

  // Auto name from the picked items until the user writes their own.
  const autoName = selected.length > 0
    ? `Combo ${selected.map(i => (i.qty > 1 ? `${i.qty}x ` : '') + i.product.name).join(' + ')}`
    : '';
  const comboName = nameTouched ? name : autoName;

  // Rebuild the combined photo whenever the picked products change.
  const imageKey = selected.map(i => i.product.id).join('|');
  const buildSeq = useRef(0);
  useEffect(() => {
    const urls = selected.map(i => i.product.imageUrl).filter(Boolean);
    if (urls.length === 0) {
      setAutoImage('');
      return;
    }
    const seq = ++buildSeq.current;
    setBuildingImage(true);
    buildComboImage(urls).then(url => {
      if (seq === buildSeq.current) {
        setAutoImage(url);
        setBuildingImage(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageKey]);

  const filtered = products
    .filter(p => !search || normalize(p.name).includes(normalize(search)))
    .slice(0, 60);

  const setQty = (id: string, qty: number) => {
    setItems(prev => {
      if (qty <= 0) return prev.filter(i => i.id !== id);
      if (prev.some(i => i.id === id)) return prev.map(i => (i.id === id ? { ...i, qty: Math.min(qty, 10) } : i));
      return [...prev, { id, qty: 1 }];
    });
  };

  const toggleCategory = (id: string) =>
    setCategoryIds(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));

  const imageUrl = customImage || autoImage;

  const handleSave = async () => {
    setError(null);
    if (totalQty < 2) return setError('Selecione pelo menos 2 itens para montar o combo.');
    if (!comboName.trim()) return setError('Dê um nome ao combo.');
    if (!(finalPrice > 0)) return setError('O preço final do combo precisa ser maior que zero.');
    if (finalPrice > original) return setError('O preço do combo não pode ser maior que a soma dos itens.');
    if (categoryIds.length === 0) return setError('Selecione ao menos uma categoria.');
    if (buildingImage) return setError('Aguarde a foto do combo terminar de ser gerada.');

    setSaving(true);
    try {
      const finalCategoryIds = categoryIds.map(id =>
        id === DESTAQUES_NEW ? addCategory({ name: 'Destaques', icon: '✨' }).id : id
      );
      const itemsText = selected.map(i => `${i.qty}x ${i.product.name}`).join(' + ');
      addProduct({
        name: comboName.trim(),
        description: description.trim() ? `${description.trim()} Inclui: ${itemsText}.` : `Inclui: ${itemsText}.`,
        price: finalPrice,
        promoPrice: finalPrice < original ? original : undefined,
        categoryIds: finalCategoryIds,
        imageUrl,
        isAvailable: true,
        ingredients: selected.map(i => `${i.qty}x ${i.product.name}`),
        tags: discountPct > 0 ? ['Combo', `${Math.round(discountPct)}% OFF`] : ['Combo']
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-3xl shadow-2xl text-slate-100 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[#2A211A] shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#FB923C]" />
            <h3 className="text-lg font-display font-extrabold text-[#F5F0EA]">Criar Combo Promocional</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#A8A29A] hover:text-white hover:bg-[#181512] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Item picker */}
          <div className="flex flex-col min-h-0">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">1. Escolha os itens do combo</label>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar no cardápio..."
                className="w-full pl-9 pr-3 py-2 text-sm input-sushi focus:outline-none"
              />
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-72 md:max-h-[420px] pr-1">
              {filtered.length === 0 && <p className="text-xs text-[#A8A29A] text-center py-6">Nenhum produto encontrado.</p>}
              {filtered.map(p => {
                const qty = items.find(i => i.id === p.id)?.qty || 0;
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${qty > 0 ? 'border-[#F97316] bg-[#1F1209]' : 'border-[#2A211A] bg-[#181512]'}`}
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#0C0A08] shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#F5F0EA] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#A8A29A] font-mono">{brl(getUnitPrice(p))}</p>
                    </div>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(p.id, 1)}
                        className="p-1.5 rounded-lg bg-[#141210] border border-[#2A211A] text-[#FB923C] hover:bg-[#2A211A] cursor-pointer"
                        title="Adicionar ao combo"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setQty(p.id, qty - 1)} className="p-1 rounded-md bg-[#141210] border border-[#2A211A] cursor-pointer">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button type="button" onClick={() => setQty(p.id, qty + 1)} className="p-1 rounded-md bg-[#141210] border border-[#2A211A] cursor-pointer">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combo details */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Foto do combo</label>
                {customImage && (
                  <button type="button" onClick={() => setCustomImage('')} className="text-[11px] text-[#FB923C] flex items-center gap-1 cursor-pointer">
                    <RotateCcw className="w-3 h-3" /> Usar foto automática
                  </button>
                )}
              </div>
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0C0A08] border border-[#2A211A] flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="Foto do combo" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-xs text-[#A8A29A] px-6 text-center">A foto é montada automaticamente com os itens lado a lado.</p>
                )}
                {(buildingImage || uploading) && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#FB923C] animate-spin" />
                  </div>
                )}
              </div>
              <label className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#A8A29A] hover:text-white cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar outra foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setUploading(true);
                    try {
                      setCustomImage(await compressImage(file, 1600, 900, 0.88));
                    } catch (err: any) {
                      setError(err?.message || 'Não foi possível carregar a foto.');
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">2. Nome do combo</label>
              <input
                type="text"
                value={comboName}
                onChange={e => { setNameTouched(true); setName(e.target.value); }}
                placeholder="Ex.: Combo Casal"
                className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Os itens do combo são adicionados automaticamente à descrição."
                className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">3. Desconto</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[#A8A29A] block mb-1">Desconto (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={priceMode === 'discount' ? discountInput : String(Math.round(discountPct * 10) / 10)}
                    onChange={e => { setPriceMode('discount'); setDiscountInput(e.target.value); }}
                    className="w-full px-3 py-2 text-sm input-sushi focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#A8A29A] block mb-1">Preço final (R$)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceMode === 'price' ? priceInput : finalPrice ? finalPrice.toFixed(2) : ''}
                    onChange={e => { setPriceMode('price'); setPriceInput(e.target.value); }}
                    className="w-full px-3 py-2 text-sm input-sushi focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="mt-3 p-3 rounded-xl bg-[#181512] border border-[#2A211A] text-xs space-y-1">
                <div className="flex justify-between text-[#A8A29A]">
                  <span>Soma dos itens ({totalQty})</span>
                  <span className="font-mono line-through">{brl(original)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-[#F5F0EA]">Preço do combo</span>
                  <span className="font-mono text-[#FB923C]">{brl(finalPrice)}</span>
                </div>
                {original > 0 && finalPrice < original && (
                  <p className="text-[10px] text-[#22C55E] text-right">Cliente economiza {brl(original - finalPrice)}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">4. Categorias</label>
              <div className="flex flex-wrap gap-1.5">
                {!destaques && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(DESTAQUES_NEW)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${categoryIds.includes(DESTAQUES_NEW) ? 'bg-[#F97316] text-white border-[#F97316]' : 'bg-[#141210] text-slate-300 border-[#2A211A]'}`}
                  >
                    ✨ Destaques (nova)
                  </button>
                )}
                {categories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${categoryIds.includes(c.id) ? 'bg-[#F97316] text-white border-[#F97316]' : 'bg-[#141210] text-slate-300 border-[#2A211A]'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#2A211A] shrink-0">
          {error && <p className="text-xs text-[#EF4444] mb-3">{error}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-[#141210] border border-[#2A211A] hover:bg-[#181512] cursor-pointer">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 btn-sushi-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Criar Combo no Cardápio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
