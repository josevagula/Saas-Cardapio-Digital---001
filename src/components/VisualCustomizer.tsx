import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { compressImage } from '../utils/imageUtils';
import { 
  Palette, 
  Smartphone, 
  Upload, 
  Check, 
  Layout, 
  Compass, 
  Eye, 
  Globe, 
  Sliders,
  Sparkles,
  MapPin,
  Truck,
  Copy,
  ExternalLink,
  Edit2,
  Clock,
  Power,
  Loader2
} from 'lucide-react';
import { checkIsStoreOpen } from '../utils/storeStatus';

export default function VisualCustomizer() {
  const { visualConfig, setVisualConfig, currentPlan } = useApp();

  const [establishmentName, setEstablishmentName] = useState(visualConfig.establishmentName);
  const [phone, setPhone] = useState(visualConfig.phone);
  const [address, setAddress] = useState(visualConfig.address);
  const [deliveryFee, setDeliveryFee] = useState(visualConfig.deliveryFee.toString());
  const [primaryColor, setPrimaryColor] = useState(visualConfig.primaryColor);
  const [fontFamily, setFontFamily] = useState(visualConfig.fontFamily);
  const [themeMode, setThemeMode] = useState(visualConfig.themeMode);
  const [logoUrl, setLogoUrl] = useState(visualConfig.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(visualConfig.bannerUrl);
  const [menuSlug, setMenuSlug] = useState(visualConfig.menuSlug || 'delivery-sushi');
  const [categoryStyle, setCategoryStyle] = useState<'default' | 'komy'>(visualConfig.categoryStyle || 'default');
  const [copied, setCopied] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Horário de Atendimento e Status
  const [openingTime, setOpeningTime] = useState(visualConfig.openingTime || '18:00');
  const [closingTime, setClosingTime] = useState(visualConfig.closingTime || '23:30');
  const [openingDays, setOpeningDays] = useState(visualConfig.openingDays || 'Segunda a Domingo');
  const [operatingDaysList, setOperatingDaysList] = useState<string[]>(
    visualConfig.operatingDaysList || ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
  );
  const [deliveryTime, setDeliveryTime] = useState(visualConfig.deliveryTime || '30-45 min');
  const [isStoreOpenManual, setIsStoreOpenManual] = useState(visualConfig.isStoreOpenManual ?? true);

  const ALL_WEEK_DAYS = [
    { code: 'dom', label: 'Dom', fullName: 'Domingo' },
    { code: 'seg', label: 'Seg', fullName: 'Segunda' },
    { code: 'ter', label: 'Ter', fullName: 'Terça' },
    { code: 'qua', label: 'Qua', fullName: 'Quarta' },
    { code: 'qui', label: 'Qui', fullName: 'Quinta' },
    { code: 'sex', label: 'Sex', fullName: 'Sexta' },
    { code: 'sab', label: 'Sáb', fullName: 'Sábado' },
  ];

  const toggleDay = (code: string) => {
    let updated: string[];
    if (operatingDaysList.includes(code)) {
      updated = operatingDaysList.filter(d => d !== code);
    } else {
      updated = [...operatingDaysList, code];
    }
    setOperatingDaysList(updated);

    if (updated.length === 7) {
      setOpeningDays("Segunda a Domingo");
    } else if (updated.length === 0) {
      setOpeningDays("Fechado todos os dias");
    } else {
      const activeLabels = ALL_WEEK_DAYS
        .filter(d => updated.includes(d.code))
        .map(d => d.label);
      setOpeningDays(activeLabels.join(', '));
    }
  };

  const isCurrentlyOpen = checkIsStoreOpen({
    ...visualConfig,
    openingTime,
    closingTime,
    operatingDaysList,
    autoStatusByTime: true,
    isStoreOpenManual
  });

  const colors = [
    { value: '#F97316', name: 'Laranja Sushi (Principal)', bg: 'bg-[#F97316]' },
    { value: '#C2410C', name: 'Laranja Vulcano', bg: 'bg-[#C2410C]' },
    { value: '#FB923C', name: 'Laranja Destaque Soft', bg: 'bg-[#FB923C]' },
    { value: '#EA580C', name: 'Laranja Teriyaki', bg: 'bg-[#EA580C]' },
  ];

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleCopyLink = () => {
    const formattedSlug = menuSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    const url = `${window.location.origin}${window.location.pathname}?menu=${formattedSlug || 'delivery-sushi'}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedSlug = menuSlug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
      setVisualConfig({
        establishmentName: establishmentName || 'Sushi & Temaki',
        phone: phone || '',
        address: address || '',
        deliveryFee: parseFloat(deliveryFee) || 0,
        deliveryTime: deliveryTime || '30-45 min',
        primaryColor: primaryColor || '#F97316',
        fontFamily: fontFamily || 'sans',
        themeMode: themeMode || 'dark',
        logoUrl: logoUrl || '',
        bannerUrl: bannerUrl || '',
        menuSlug: formattedSlug || 'delivery-sushi',
        categoryStyle,
        openingTime,
        closingTime,
        openingDays,
        operatingDaysList,
        autoStatusByTime: true,
        isStoreOpenManual
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Erro ao salvar configurações visuais:', err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="sushi-visual-customizer">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-mono font-semibold text-[#FB923C] uppercase tracking-widest">Branding do Delivery</span>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Personalização Visual</h2>
          <p className="text-sm text-[#A8A29A] mt-1">Molde as cores, imagens de cabeçalho, logotipo e as fontes do seu cardápio público digital.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#141210] px-3.5 py-2 rounded-xl border border-[#2A211A] shadow-xs text-xs font-mono font-bold text-slate-300 self-start">
          <Smartphone className="w-4.5 h-4.5 text-[#FB923C]" />
          <span>Layout Mobile Ativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Panel */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-[#141210] p-4 sm:p-7 rounded-2xl border border-[#2A211A] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2A211A] pb-4 mb-4">
            <h3 className="text-base font-display font-extrabold text-[#F5F0EA] flex items-center gap-2">
              <Sliders className="text-[#FB923C] w-5 h-5" />
              Configuração da Marca
            </h3>
            <button
              type="submit"
              className="px-5 py-2.5 btn-sushi-primary text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>

          {/* Link do Cardápio Digital */}
          <div className="bg-[#181512] p-4 rounded-xl border border-[#2A211A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F0EA] flex items-center gap-1.5 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-[#FB923C]" /> Link do Cardápio Online
              </span>
              <span className="text-[10px] bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] px-2 py-0.5 rounded-full font-bold font-mono">
                Ativo
              </span>
            </div>
            
            <p className="text-xs text-[#A8A29A] leading-relaxed">
              O seu cardápio está online e pode ser acessado de qualquer lugar. Altere a parte final abaixo para personalizar o seu link exclusivo.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 flex items-center bg-[#0C0A08] border border-[#2A211A] rounded-xl overflow-hidden shadow-xs">
                <span className="bg-[#141210] px-3 py-2 text-xs text-[#A8A29A] font-mono select-none border-r border-[#2A211A] shrink-0 truncate max-w-[150px] sm:max-w-none">
                  ?menu=
                </span>
                <input
                  type="text"
                  value={menuSlug}
                  onChange={(e) => setMenuSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-'))}
                  placeholder="link-do-cardapio"
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-white bg-transparent focus:outline-none"
                  title="Altere esta parte para mudar o link do seu cardápio"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    copied 
                      ? 'bg-[#1F1209] text-[#FB923C] border-[#4A2A10]' 
                      : 'bg-[#141210] text-slate-300 border-[#2A211A] hover:bg-[#181512]'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <a
                  href={`${window.location.origin}${window.location.pathname}?menu=${menuSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 btn-sushi-primary text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Testar</span>
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Nome Fantasia do Restaurante</label>
              <input
                type="text"
                required
                value={establishmentName}
                onChange={(e) => setEstablishmentName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">WhatsApp de Atendimento</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Endereço Físico</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm input-sushi focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Taxa de Entrega (R$)</label>
              <div className="relative">
                <Truck className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3" />
                <input
                  type="number"
                  step="0.10"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm input-sushi focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tempo de Entrega Estimado</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-[#A8A29A] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="Ex: 30-45 min"
                  className="w-full pl-10 pr-4 py-2.5 text-sm input-sushi focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Horário de Atendimento e Status da Loja */}
          <div className="bg-[#181512] p-4.5 rounded-xl border border-[#2A211A] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2A211A] pb-3">
              <span className="text-xs font-bold text-[#F5F0EA] flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-[#FB923C]" /> Horário de Atendimento e Status
              </span>

              {/* Live Status indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#A8A29A]">Status no site:</span>
                <div className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 border ${
                  isCurrentlyOpen 
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40' 
                    : 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isCurrentlyOpen ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'}`}></span>
                  <span>{isCurrentlyOpen ? 'ABERTO' : 'FECHADO'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Horário Abertura</label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 text-xs input-sushi focus:outline-none cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Horário Fechamento</label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full px-3 py-2 text-xs input-sushi focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Dias de Funcionamento (Marque os dias que irá atender)
              </label>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {ALL_WEEK_DAYS.map((day) => {
                  const isSelected = operatingDaysList.includes(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      onClick={() => toggleDay(day.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? 'bg-[#F97316] text-white border-[#F97316] shadow-sm'
                          : 'bg-[#141210] text-[#A8A29A] border-[#2A211A] hover:border-[#3A312A]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-transparent border border-[#A8A29A]'}`}></span>
                      <span>{day.label}</span>
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={openingDays}
                onChange={(e) => setOpeningDays(e.target.value)}
                placeholder="Ex: Segunda a Domingo"
                className="w-full px-3 py-2 text-xs input-sushi focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-[#2A211A]/50">
              <button
                type="button"
                onClick={() => setIsStoreOpenManual(!isStoreOpenManual)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-2 ${
                  isStoreOpenManual
                    ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 hover:bg-[#EF4444]/30'
                    : 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40 hover:bg-[#22C55E]/30'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isStoreOpenManual ? 'Forçar Fechamento do Cardápio' : 'Abrir Cardápio Agora'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Paleta de Cores do Cardápio</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {colors.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setPrimaryColor(c.value)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-slate-200 transition-all cursor-pointer ${
                    primaryColor === c.value 
                      ? 'border-[#F97316] bg-[#1F1209]' 
                      : 'border-[#2A211A] bg-[#181512] hover:border-slate-600'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: c.value }}></div>
                  <span className="truncate">{c.name}</span>
                  {primaryColor === c.value && <Check className="w-3.5 h-3.5 ml-auto text-[#FB923C]" />}
                </button>
              ))}

              {/* Custom Color Picker Option */}
              <div
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold text-slate-200 transition-all ${
                  !colors.some(c => c.value === primaryColor)
                    ? 'border-[#F97316] bg-[#1F1209]' 
                    : 'border-[#2A211A] bg-[#181512] hover:border-slate-600'
                }`}
              >
                <div className="relative w-5 h-5 rounded-full shrink-0 overflow-hidden border border-[#2A211A]">
                  <input
                    id="custom-color-picker"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="absolute inset-0 w-10 h-10 -translate-x-2 -translate-y-2 cursor-pointer p-0 border-0"
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[9px] text-[#A8A29A] font-normal leading-none mb-0.5">Personalizada</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[10px] text-slate-200 uppercase truncate leading-none">{primaryColor}</span>
                    <label htmlFor="custom-color-picker" className="p-0.5 text-[#A8A29A] hover:text-slate-200 rounded cursor-pointer transition-all flex items-center justify-center" title="Editar cor">
                      <Edit2 className="w-2.5 h-2.5" />
                    </label>
                  </div>
                </div>
                {!colors.some(c => c.value === primaryColor) && <Check className="w-3.5 h-3.5 ml-auto text-[#FB923C] shrink-0" />}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">Estilo das Categorias no Cardápio</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCategoryStyle('default')}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  categoryStyle === 'default'
                    ? 'border-[#F97316] bg-[#1F1209]'
                    : 'border-[#2A211A] bg-[#181512] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Estilo Padrão</span>
                  {categoryStyle === 'default' && <Check className="w-3.5 h-3.5 text-[#FB923C]" />}
                </div>
                {/* mini preview */}
                <div className="flex gap-1.5 overflow-hidden">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-[#F97316] text-white shrink-0">⭐ Destaques</span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#161616] border border-[#262626] text-[#9CA3AF] shrink-0">🍣 Sushi</span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-[#161616] border border-[#262626] text-[#9CA3AF] shrink-0">🥤 Bebidas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCategoryStyle('komy')}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  categoryStyle === 'komy'
                    ? 'border-[#F97316] bg-[#1F1209]'
                    : 'border-[#2A211A] bg-[#181512] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Estilo Cápsula</span>
                  {categoryStyle === 'komy' && <Check className="w-3.5 h-3.5 text-[#FB923C]" />}
                </div>
                {/* mini preview */}
                <div className="flex gap-1 bg-black rounded-full p-1 overflow-hidden w-fit max-w-full">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F97316] text-black shrink-0">⭐ Destaques</span>
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-[#9CA3AF] shrink-0">🍣 Sushi</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Tema Inicial do Cardápio</label>
            <select
              value={themeMode}
              onChange={(e: any) => setThemeMode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm input-sushi focus:outline-none"
            >
              <option value="dark" className="bg-[#141210] text-white">Modo Escuro (Sushi Premium Dark)</option>
              <option value="light" className="bg-[#141210] text-white">Modo Claro</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Logomarca */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Logomarca do Cardápio</label>
              <div className="flex items-center gap-3 bg-[#181512] p-2.5 rounded-xl border border-[#2A211A]">
                <img 
                  src={logoUrl || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100"} 
                  alt="Logo preview" 
                  className="w-10 h-10 rounded-full object-cover border border-[#2A211A] shrink-0 bg-[#0C0A08]"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141210] text-[11px] font-bold text-slate-200 hover:text-white border border-[#2A211A] rounded-lg hover:bg-[#2A211A] transition-colors shadow-xs shrink-0">
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-[#FB923C] animate-spin" />
                          <span>Otimizando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-[#FB923C]" />
                          <span>Upload Logo</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={isUploadingLogo}
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setIsUploadingLogo(true);
                              const compressed = await compressImage(file, 400, 400, 0.85);
                              setLogoUrl(compressed);
                            } catch (err) {
                              console.error('Erro ao otimizar imagem da logo:', err);
                            } finally {
                              setIsUploadingLogo(false);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Ou cole a URL da logo (https://...)"
                    className="w-full px-2.5 py-1 text-[11px] font-mono input-sushi focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Banner */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Banner de Cabeçalho</label>
              <div className="flex items-center gap-3 bg-[#181512] p-2.5 rounded-xl border border-[#2A211A]">
                <img 
                  src={bannerUrl || "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500"} 
                  alt="Banner preview" 
                  className="w-12 h-10 rounded-lg object-cover border border-[#2A211A] shrink-0 bg-[#0C0A08]"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#141210] text-[11px] font-bold text-slate-200 hover:text-white border border-[#2A211A] rounded-lg hover:bg-[#2A211A] transition-colors shadow-xs shrink-0">
                      {isUploadingBanner ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-[#FB923C] animate-spin" />
                          <span>Otimizando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-[#FB923C]" />
                          <span>Upload Banner</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={isUploadingBanner}
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setIsUploadingBanner(true);
                              const compressed = await compressImage(file, 1200, 600, 0.82);
                              setBannerUrl(compressed);
                            } catch (err) {
                              console.error('Erro ao otimizar banner:', err);
                            } finally {
                              setIsUploadingBanner(false);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="Ou cole a URL do banner (https://...)"
                    className="w-full px-2.5 py-1 text-[11px] font-mono input-sushi focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2A211A] flex flex-col sm:flex-row items-center justify-between gap-4">
            {saveSuccess ? (
              <div className="w-full sm:w-auto flex items-center gap-2 px-3.5 py-2 bg-[#22C55E]/15 border border-[#22C55E]/40 text-[#22C55E] rounded-xl text-xs font-bold animate-fadeIn">
                <Check className="w-4 h-4" />
                <span>Identidade Visual e Horário salvos com sucesso!</span>
              </div>
            ) : <div />}
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 btn-sushi-primary text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>

        {/* Live Device Simulator Preview Panel */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-center mb-4">
            <span className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">Simulação em Tempo Real</span>
            <p className="text-xs text-[#A8A29A]">Veja como fica no smartphone do cliente</p>
          </div>

          {/* Smartphone Frame */}
          <div className="w-[320px] h-[580px] rounded-[36px] bg-[#0C0A08] p-3 shadow-2xl border-[6px] border-[#2A211A] relative overflow-hidden flex flex-col justify-between">
            {/* Topnotch camera slot */}
            <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-[#141210] rounded-full z-10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#0C0A08]"></div>
            </div>

            {/* Inner frame mock cardápio */}
            <div className={`flex-1 rounded-[28px] overflow-y-auto overflow-x-hidden flex flex-col relative ${
              themeMode === 'dark' ? 'bg-[#0C0A08] text-slate-100' : 'bg-white text-slate-800'
            }`}>
              {/* header banner */}
              <div className="h-24 relative bg-slate-800 shrink-0">
                <img 
                  src={bannerUrl || "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500"} 
                  alt="Banner" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40"></div>

                {/* mini logo */}
                <div className="absolute -bottom-4 left-4">
                  <img 
                    src={logoUrl || "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100"} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-full border-2 border-[#2A211A] object-cover shadow-md"
                  />
                </div>
              </div>

              {/* Establishment info */}
              <div className="pt-6 px-4">
                <h4 className="text-sm font-display font-extrabold tracking-tight" style={{ color: primaryColor }}>
                  {establishmentName}
                </h4>
                <p className="text-[9px] text-[#A8A29A] truncate mt-0.5">
                  📍 {address}
                </p>

                {/* simulated menu section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Combinados Sushi</span>
                    <span className="w-8 h-0.5" style={{ backgroundColor: primaryColor }}></span>
                  </div>

                  {/* item mock */}
                  <div className={`p-2.5 rounded-xl border border-dashed flex gap-3 ${
                    themeMode === 'dark' ? 'bg-[#141210] border-[#2A211A]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="w-12 h-12 rounded-lg bg-slate-800 shrink-0 overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=100" 
                        alt="Sushi" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-[11px] font-bold truncate">Combo Tokio Premium (32p)</h5>
                      <p className="text-[9px] text-[#A8A29A] line-clamp-1 leading-snug">Sashimi de salmão, uramaki e hossomaki...</p>
                      <p className="text-xs font-bold font-mono mt-1" style={{ color: primaryColor }}>R$ 89,90</p>
                    </div>
                  </div>
                </div>

                {/* Simulated delivery badge */}
                <div className={`p-3 rounded-xl mt-6 flex justify-between items-center border ${
                  themeMode === 'dark' ? 'bg-[#141210] border-[#2A211A]' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="text-[9px] font-semibold text-[#A8A29A]">Entrega rápida:</span>
                  <span className="text-xs font-bold font-mono" style={{ color: primaryColor }}>R$ {(parseFloat(deliveryFee) || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
