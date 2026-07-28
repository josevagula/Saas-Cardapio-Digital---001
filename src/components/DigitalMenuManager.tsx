import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Category } from '../types';
import { safeNumber, formatCurrency } from '../utils/formatters';
import { compressImage } from '../utils/imageUtils';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Sparkles, 
  Check, 
  X, 
  FolderPlus, 
  Utensils, 
  Flame,
  Fish,
  Beef,
  Coffee,
  Wine,
  IceCream,
  Star,
  Heart,
  Eye, 
  EyeOff, 
  Tag, 
  AlertCircle,
  Download,
  Upload,
  Loader2
} from 'lucide-react';

export default function DigitalMenuManager() {
  const { 
    products, 
    categories, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    addCategory, 
    updateCategory,
    deleteCategory,
    generateAIDescription 
  } = useApp();

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'imagem-produto.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback if CORS prevents direct fetch
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename || 'imagem-produto.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const CATEGORY_ICONS_LIST = [
    { id: 'Utensils', name: 'Utensílios' },
    { id: 'Fish', name: 'Peixe / Sushi' },
    { id: 'Flame', name: 'Hot / Chama' },
    { id: 'Beef', name: 'Grelhados' },
    { id: 'Coffee', name: 'Bebidas' },
    { id: 'Wine', name: 'Saquê / Vinho' },
    { id: 'IceCream', name: 'Sobremesas' },
    { id: 'Sparkles', name: 'Destaques' },
    { id: 'Tag', name: 'Promoções' },
    { id: 'Star', name: 'Especiais' },
    { id: 'Heart', name: 'Favoritos' },
  ];

  const renderCatIcon = (iconName: string = '', className = "w-4 h-4") => {
    switch ((iconName || '').toLowerCase()) {
      case 'flame': return <Flame className={className} />;
      case 'fish': return <Fish className={className} />;
      case 'beef': return <Beef className={className} />;
      case 'coffee': return <Coffee className={className} />;
      case 'wine': return <Wine className={className} />;
      case 'icecream':
      case 'ice-cream': return <IceCream className={className} />;
      case 'star': return <Star className={className} />;
      case 'heart': return <Heart className={className} />;
      case 'tag': return <Tag className={className} />;
      case 'sparkles': return <Sparkles className={className} />;
      case 'utensils':
      default: return <Utensils className={className} />;
    }
  };
  
  // Modals / Forms States
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [tags, setTags] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Category Fields
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Utensils');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatIcon, setEditCatIcon] = useState('Utensils');

  // AI Generation States
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<{ description: string; copy: string; keywords: string[] } | null>(null);

  // Reset fields
  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setPromoPrice('');
    setCategoryId(categories[0]?.id || '');
    setImageUrl('https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&h=400&fit=crop&q=80');
    setIngredients('');
    setTags('');
    setIsAvailable(true);
    setAiResult(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddingProduct(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description);
    setPrice(p.price.toString());
    setPromoPrice(p.promoPrice ? p.promoPrice.toString() : '');
    setCategoryId(p.categoryId);
    setImageUrl(p.imageUrl);
    setIngredients(p.ingredients.join(', '));
    setTags(p.tags ? p.tags.join(', ') : '');
    setIsAvailable(p.isAvailable);
    setAiResult(null);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) return;

    const parsedIngredients = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const numPrice = safeNumber(price);
    const numPromoPrice = promoPrice ? safeNumber(promoPrice) : undefined;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name,
        description,
        price: numPrice,
        promoPrice: numPromoPrice && numPromoPrice > 0 ? numPromoPrice : undefined,
        categoryId,
        imageUrl,
        isAvailable,
        ingredients: parsedIngredients,
        tags: parsedTags
      });
      setEditingProduct(null);
    } else {
      addProduct({
        name,
        description,
        price: numPrice,
        promoPrice: numPromoPrice && numPromoPrice > 0 ? numPromoPrice : undefined,
        categoryId,
        imageUrl,
        isAvailable,
        ingredients: parsedIngredients,
        tags: parsedTags
      });
      setIsAddingProduct(false);
    }
    resetForm();
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName.trim(), icon: newCatIcon });
    setNewCatName('');
  };

  const handleStartEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon || 'Utensils');
  };

  const handleSaveEditCat = (id: string) => {
    if (!editCatName.trim()) return;
    updateCategory({ id, name: editCatName.trim(), icon: editCatIcon });
    setEditingCatId(null);
  };

  const handleDeleteCat = (cat: Category) => {
    const prodCount = products.filter(p => p.categoryId === cat.id).length;
    if (prodCount > 0) {
      if (!confirm(`A categoria "${cat.name}" possui ${prodCount} produto(s) associado(s). Deseja realmente excluí-la?`)) {
        return;
      }
    } else {
      if (!confirm(`Excluir a categoria "${cat.name}"?`)) return;
    }
    deleteCategory(cat.id);
  };

  // AI Integration: generate descriptions from title, category name, ingredients
  const handleAIGeneration = async () => {
    if (!name) {
      alert("Por favor, digite o nome do produto primeiro.");
      return;
    }
    setGeneratingAI(true);
    try {
      const cat = categories.find(c => c.id === categoryId)?.name || "Comida";
      const ingList = ingredients.split(',').map(i => i.trim()).filter(Boolean);
      const data = await generateAIDescription(name, cat, ingList);
      setAiResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAI(false);
    }
  };

  const applyAIDescription = () => {
    if (aiResult) {
      setDescription(aiResult.description);
      if (aiResult.keywords && aiResult.keywords.length > 0) {
        setTags(aiResult.keywords.join(', '));
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="luvia-menu-manager">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">Controle de produtos</span>
          <h2 className="text-2xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-0.5">Gerenciamento do Cardápio</h2>
          <p className="text-xs text-[#A8A29A] mt-0.5">Cadastre novos pratos, categorias, controle preços e use IA para otimizar descrições.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-[#141210] text-slate-200 text-xs font-semibold rounded-xl border border-[#2A211A] hover:bg-[#181512] transition-all shadow-xs cursor-pointer w-full sm:w-auto"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#FB923C]" />
            <span>Gerenciar Categorias</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 btn-sushi-primary text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Produto</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-[#141210] p-4 rounded-xl border border-[#2A211A] shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Buscar produtos ou ingredientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm input-sushi focus:outline-none transition-all"
          />
        </div>

        {/* Categories Pill Horizontal List */}
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all' 
                ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-xs' 
                : 'bg-[#181512] text-slate-300 hover:bg-[#2A211A] border border-[#2A211A]'
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id 
                    ? 'bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white shadow-xs' 
                    : 'bg-[#181512] text-slate-300 hover:bg-[#2A211A] border border-[#2A211A]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#141210] p-12 text-center rounded-2xl border border-[#2A211A] shadow-sm">
          <Utensils className="w-12 h-12 text-[#A8A29A]/50 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#F5F0EA]">Nenhum produto cadastrado</h4>
          <p className="text-sm text-[#A8A29A] mt-1">Não encontramos nenhum resultado correspondente aos filtros atuais.</p>
          <button 
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 btn-sushi-primary text-white text-sm font-bold shadow-md cursor-pointer"
          >
            Cadastrar Primeiro Produto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(prod => {
            const catName = categories.find(c => c.id === prod.categoryId)?.name || 'Outros';
            return (
              <div 
                key={prod.id} 
                className={`bg-[#141210] rounded-2xl border border-[#2A211A] shadow-sm hover:border-[#3A2E24] transition-all overflow-hidden flex flex-col justify-between ${
                  !prod.isAvailable ? 'opacity-60' : ''
                }`}
              >
                <div>
                  {/* Product Header Image */}
                  <div className="relative h-44 bg-[#0C0A08]">
                    <img 
                      src={prod.imageUrl} 
                      alt={prod.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="bg-[#0C0A08]/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-md backdrop-blur-sm border border-[#2A211A]">
                        {catName}
                      </span>
                      {prod.promoPrice && (
                        <span className="bg-gradient-to-r from-[#C2410C] to-[#F97316] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs">
                          Promoção
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(prod.imageUrl, `${prod.name.toLowerCase().replace(/\s+/g, '-')}.jpg`)}
                        className="p-2 rounded-xl bg-[#0C0A08]/80 text-[#FB923C] hover:bg-[#141210] backdrop-blur-sm shadow-sm transition-colors cursor-pointer border border-[#2A211A]"
                        title="Baixar Imagem do Produto"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProduct({ ...prod, isAvailable: !prod.isAvailable })}
                        className="p-2 rounded-xl bg-[#0C0A08]/80 text-slate-300 hover:bg-[#141210] backdrop-blur-sm shadow-sm transition-colors cursor-pointer border border-[#2A211A]"
                        title={prod.isAvailable ? "Pausar Produto" : "Ativar Produto"}
                      >
                        {prod.isAvailable ? <Eye className="w-4 h-4 text-[#F97316]" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-display font-bold text-[#F5F0EA] text-base leading-snug">{prod.name}</h4>
                      <div className="text-right">
                        {prod.promoPrice && safeNumber(prod.promoPrice) > 0 ? (
                          <>
                            <span className="text-[10px] line-through text-[#A8A29A]/70 font-mono">R$ {formatCurrency(prod.price)}</span>
                            <p className="text-sm font-bold text-[#FB923C] font-mono">R$ {formatCurrency(prod.promoPrice)}</p>
                          </>
                        ) : (
                          <p className="text-sm font-bold text-[#F5F0EA] font-mono">R$ {formatCurrency(prod.price)}</p>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#A8A29A] mt-2 line-clamp-2 leading-relaxed">{prod.description}</p>

                    {/* Ingredients tags */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {prod.ingredients.map((ing, idx) => (
                        <span key={idx} className="bg-[#181512] text-slate-300 border border-[#2A211A] text-[10px] px-2 py-0.5 rounded-md font-medium">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-[#181512] border-t border-[#2A211A] flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono font-medium text-[#A8A29A]">
                    Vendas: <span className="text-[#FB923C] font-bold">{prod.salesCount}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(prod)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#141210] transition-colors cursor-pointer border border-transparent hover:border-[#2A211A]"
                      title="Editar Produto"
                    >
                      <Edit3 className="w-4 h-4 text-[#FB923C]" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Excluir o produto "${prod.name}" do cardápio?`)) {
                          deleteProduct(prod.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer border border-transparent hover:border-red-900/40"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {(isAddingProduct || editingProduct) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">
            <div className="p-6 border-b border-[#2A211A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#1F1209] text-[#FB923C] rounded-lg border border-[#4A2A10]">
                  <Sparkles className="w-5 h-5 fill-[#FB923C]/25" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-extrabold text-[#F5F0EA]">
                    {editingProduct ? `Editar: ${name}` : 'Cadastrar Novo Item'}
                  </h3>
                  <p className="text-xs text-[#A8A29A]">Insira as informações do item e use IA para preenchimento de copy automática.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                }} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#181512] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Grid Form */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Product Information Form */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nome do Prato*</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Combo Hot Roll Salmon"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Categoria*</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="bg-[#141210] text-white">{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Preço Original (R$)*</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Preço Promocional (Opcional)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Deixe em branco se não houver"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Foto do Produto*</label>
                  <div className="flex items-center gap-3 bg-[#181512] p-2.5 rounded-lg border border-[#2A211A]">
                    <img 
                      src={imageUrl || "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150"} 
                      alt="Product preview" 
                      className="w-12 h-12 rounded-lg object-cover border border-[#2A211A] shrink-0 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141210] text-[11px] font-semibold text-[#FB923C] hover:text-[#F97316] border border-[#2A211A] rounded-md transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Carregar Foto</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 800, 600, 0.82);
                                setImageUrl(compressed);
                              } catch (err) {
                                console.error('Erro ao otimizar foto do produto:', err);
                              }
                            }
                          }}
                        />
                      </label>
                      <p className="text-[9px] text-[#A8A29A] mt-0.5 truncate">Selecione uma imagem do seu dispositivo</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Ingredientes (Separados por vírgula)</label>
                  <input
                    type="text"
                    placeholder="Ex: Salmão, Cream Cheese, Arroz Shari, Cebolinha"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">Descrição do Produto</label>
                    <button
                      type="button"
                      onClick={handleAIGeneration}
                      disabled={generatingAI}
                      className="text-xs font-semibold text-[#FB923C] hover:text-[#F97316] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                      <span>{generatingAI ? "Pensando..." : "Redigir com IA"}</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Escreva a descrição do produto ou utilize a inteligência artificial ao lado para gerar uma de alta qualidade..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all resize-none leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="w-full btn-sushi-primary text-white py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                    }}
                    className="w-full sm:w-auto px-5 bg-[#181512] hover:bg-[#2A211A] text-slate-300 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border border-[#2A211A] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              {/* AI Assistant Sidebar Panel */}
              <div className="lg:col-span-5 bg-[#0C0A08] rounded-2xl p-5 border border-[#2A211A] text-slate-300 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[#FB923C] fill-[#FB923C]" />
                    <h4 className="text-sm font-display font-bold text-[#F5F0EA] tracking-tight">Estúdio de Copywriter IA</h4>
                  </div>

                  {generatingAI && (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-8 h-8 rounded-full border-2 border-[#F97316] border-t-transparent animate-spin mx-auto"></div>
                      <p className="text-xs text-[#A8A29A] font-mono">Cozinhando sugestões perfeitas...</p>
                    </div>
                  )}

                  {!generatingAI && !aiResult && (
                    <div className="py-8 text-center text-xs text-[#A8A29A] border border-dashed border-[#2A211A] rounded-xl px-4">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#A8A29A]/50" />
                      <span>Insira o nome do produto e clique em "Redigir com IA" para obter textos persuasivos focados em delivery de alta conversão.</span>
                    </div>
                  )}

                  {!generatingAI && aiResult && (
                    <div className="space-y-4">
                      {/* suggested description */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-semibold text-[#FB923C] uppercase tracking-widest">Descrição Gourmet</span>
                          <button
                            type="button"
                            onClick={applyAIDescription}
                            className="text-xs font-semibold text-[#F97316] hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aplicar no Form</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 bg-[#141210] p-3 rounded-xl border border-[#2A211A] leading-relaxed max-h-36 overflow-y-auto">
                          {aiResult.description}
                        </p>
                      </div>

                      {/* suggested copy */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-semibold text-[#F97316] uppercase tracking-widest">Copy para WhatsApp</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(aiResult.copy);
                              alert("Copy copiada para o clipboard!");
                            }}
                            className="text-xs font-semibold text-[#A8A29A] hover:text-white underline cursor-pointer"
                          >
                            Copiar Texto
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 bg-[#141210] p-3 rounded-xl border border-[#2A211A] leading-relaxed max-h-36 overflow-y-auto font-mono">
                          {aiResult.copy}
                        </p>
                      </div>

                      {/* SEO Tags */}
                      <div>
                        <span className="text-[10px] font-mono font-semibold text-orange-400 uppercase tracking-widest block mb-1.5">Palavras-Chave Recomendadas</span>
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.keywords.map((kw, idx) => (
                            <span key={idx} className="bg-[#181512] text-slate-300 px-2 py-0.5 rounded-md text-[10px] border border-[#2A211A]">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2A211A] pt-4 mt-6 flex flex-col gap-2">
                  <button
                    type="submit"
                    className="w-full btn-sushi-primary text-white py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-colors"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingProduct(false);
                      setEditingProduct(null);
                    }}
                    className="w-full bg-[#181512] hover:bg-[#2A211A] text-slate-300 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[#2A211A] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT CATEGORIES */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141210] rounded-2xl border border-[#2A211A] w-full max-w-lg shadow-2xl p-6 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2A211A] shrink-0">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#FB923C]" />
                <h3 className="text-lg font-display font-extrabold text-[#F5F0EA]">Gerenciar Categorias</h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCatId(null);
                }} 
                className="p-1.5 rounded-lg text-[#A8A29A] hover:text-white hover:bg-[#181512] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-6 pr-1 flex-1">
              {/* Form Criar Nova Categoria */}
              <div className="bg-[#181512] p-4 rounded-xl border border-[#2A211A]">
                <h4 className="text-xs font-bold text-[#FB923C] uppercase tracking-wider mb-3">Criar Nova Categoria</h4>
                <form onSubmit={handleSaveCategory} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">Nome da Categoria*</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Temakis, Combos Especiais, Bebidas"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm input-sushi focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Ícone da Categoria</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {CATEGORY_ICONS_LIST.map((iconItem) => {
                        const isSelected = newCatIcon === iconItem.id;
                        return (
                          <button
                            key={iconItem.id}
                            type="button"
                            onClick={() => setNewCatIcon(iconItem.id)}
                            className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#FB923C]/20 border-[#FB923C] text-[#FB923C] font-bold shadow-xs'
                                : 'bg-[#141210] border-[#2A211A] text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                            title={iconItem.name}
                          >
                            {renderCatIcon(iconItem.id, "w-4 h-4")}
                            <span className="text-[9px] truncate max-w-full leading-tight">{iconItem.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 btn-sushi-primary text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Categoria</span>
                  </button>
                </form>
              </div>

              {/* Categorias Existentes */}
              <div>
                <h4 className="text-xs font-bold text-[#A8A29A] uppercase tracking-wider mb-3">
                  Categorias Existentes ({categories.length})
                </h4>

                <div className="space-y-2">
                  {categories.map((cat) => {
                    const prodCount = products.filter(p => p.categoryId === cat.id).length;
                    const isEditing = editingCatId === cat.id;

                    return (
                      <div 
                        key={cat.id} 
                        className="bg-[#181512] border border-[#2A211A] rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        {isEditing ? (
                          <div className="flex-1 flex flex-col gap-3 bg-[#141210] p-3 rounded-xl border border-[#2A211A]">
                            <div>
                              <label className="text-[11px] font-bold text-[#FB923C] uppercase tracking-wider block mb-1">
                                Nome da Categoria
                              </label>
                              <input
                                type="text"
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs input-sushi focus:outline-none"
                                placeholder="Nome da categoria"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                Selecionar Ícone
                              </label>
                              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-24 overflow-y-auto pr-1">
                                {CATEGORY_ICONS_LIST.map((iconItem) => {
                                  const isSelected = editCatIcon === iconItem.id;
                                  return (
                                    <button
                                      key={iconItem.id}
                                      type="button"
                                      onClick={() => setEditCatIcon(iconItem.id)}
                                      className={`p-1 rounded-lg border flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#FB923C]/20 border-[#FB923C] text-[#FB923C] font-bold'
                                          : 'bg-[#181512] border-[#2A211A] text-slate-400 hover:text-white'
                                      }`}
                                      title={iconItem.name}
                                    >
                                      {renderCatIcon(iconItem.id, "w-3.5 h-3.5")}
                                      <span className="text-[8px] truncate max-w-full leading-tight">{iconItem.name.split(' ')[0]}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-[#2A211A]">
                              <button
                                type="button"
                                onClick={() => setEditingCatId(null)}
                                className="px-2.5 py-1 rounded-lg bg-[#181512] text-[#A8A29A] hover:text-white text-xs border border-[#2A211A] cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditCat(cat.id)}
                                className="px-3 py-1 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Salvar</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#141210] border border-[#2A211A] flex items-center justify-center shrink-0 text-[#FB923C]">
                                {renderCatIcon(cat.icon, "w-3.5 h-3.5")}
                              </div>
                              <span className="font-bold text-sm text-[#F5F0EA] truncate">{cat.name}</span>
                              <span className="text-[10px] font-mono text-[#FB923C] bg-[#1F1209] border border-[#4A2A10] px-2 py-0.5 rounded-full font-semibold shrink-0">
                                {prodCount} {prodCount === 1 ? 'produto' : 'produtos'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditCat(cat)}
                                className="p-1.5 rounded-lg bg-[#141210] border border-[#2A211A] text-[#FB923C] hover:bg-[#2A211A] transition-colors cursor-pointer"
                                title="Editar categoria"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCat(cat)}
                                className="p-1.5 rounded-lg bg-[#141210] border border-[#2A211A] text-slate-400 hover:text-red-400 hover:border-red-900/40 transition-colors cursor-pointer"
                                title="Excluir categoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-[#2A211A] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(false);
                  setEditingCatId(null);
                }}
                className="px-4 py-2 bg-[#181512] hover:bg-[#2A211A] text-slate-300 text-xs font-semibold rounded-lg border border-[#2A211A] transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
