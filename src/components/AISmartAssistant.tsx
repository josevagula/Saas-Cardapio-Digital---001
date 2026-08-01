import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  TrendingUp, 
  Lightbulb, 
  Flame, 
  Clock, 
  FileText, 
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Copy,
  Plus
} from 'lucide-react';

export default function AISmartAssistant() {
  const { suggestAICombos, products } = useApp();

  // AI Promotions States
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [aiPromos, setAiPromos] = useState<any>(null);

  const handleFetchPromos = async () => {
    setLoadingPromos(true);
    try {
      const data = await suggestAICombos();
      setAiPromos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPromos(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#0C0A08] font-sans text-slate-100" id="luvia-ai-assistant">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#FB923C] uppercase tracking-widest">Inteligência de Mercado</span>
          <h2 className="text-3xl font-display font-extrabold text-[#F5F0EA] tracking-tight mt-1">Luvia AI Studio</h2>
          <p className="text-xs text-[#A8A29A] mt-1">Gere combos lucrativos, sugestões de desconto inteligentes e automatize o marketing para suas redes sociais.</p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1F1209] border border-[#4A2A10] px-3.5 py-1.5 rounded-full text-xs font-bold text-[#FB923C] self-start">
          <Sparkles className="w-3.5 h-3.5 text-[#FB923C] fill-[#FB923C]" />
          <span>ChatGPT Ativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Control Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#141210] p-6 rounded-2xl border border-[#2A211A] shadow-xs">
            <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-2">Engenharia de Combos IA</h3>
            <p className="text-xs text-[#A8A29A] leading-relaxed mb-6">
              Nossa inteligência artificial analisa seus produtos cadastrados, as margens de preço e a aderência de ingredientes para criar duplas ou trios imbatíveis de alta conversão.
            </p>

            <button
              onClick={handleFetchPromos}
              disabled={loadingPromos || products.length === 0}
              className="w-full btn-sushi-primary text-white font-bold py-3 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>{loadingPromos ? "Gerando Combos..." : "Criar Novas Promoções"}</span>
            </button>

            {products.length === 0 && (
              <p className="text-[10px] text-red-400 mt-2 font-semibold">
                *Você precisa cadastrar produtos no cardápio primeiro!
              </p>
            )}
          </div>

          <div className="bg-[#181512] text-slate-300 p-5 rounded-2xl border border-[#2A211A] space-y-4">
            <h4 className="text-xs font-mono text-[#FB923C] uppercase tracking-widest font-bold">Como funciona a IA?</h4>
            <div className="space-y-3 text-xs leading-relaxed">
              <div className="flex gap-2.5">
                <span className="text-white font-bold">1.</span>
                <p>Nossos algoritmos leem os nomes, descrições e ingredientes dos pratos cadastrados por você.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="text-white font-bold">2.</span>
                <p>A IA analisa os dados e projeta combinações cruzadas de alta conversão (ex: agregando bebidas).</p>
              </div>
              <div className="flex gap-2.5">
                <span className="text-white font-bold">3.</span>
                <p>O ChatGPT sugere estratégias de copy persuasivas ideais para postagem rápida no WhatsApp.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Dynamic Report Column */}
        <div className="lg:col-span-2 space-y-6">
          {loadingPromos && (
            <div className="bg-[#141210] p-12 text-center rounded-2xl border border-[#2A211A] shadow-xs space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#F97316] border-t-transparent animate-spin mx-auto"></div>
              <div>
                <h4 className="font-bold text-[#F5F0EA]">Conectando à OpenAI...</h4>
                <p className="text-xs text-[#A8A29A] mt-1">Estruturando combinações de alta rentabilidade com IA.</p>
              </div>
            </div>
          )}

          {!loadingPromos && !aiPromos && (
            <div className="bg-[#141210] p-12 text-center rounded-2xl border border-[#2A211A] shadow-xs text-[#A8A29A]">
              <HelpCircle className="w-12 h-12 text-[#A8A29A]/50 mx-auto mb-4" />
              <h4 className="font-bold text-[#F5F0EA]">Nenhum relatório gerado hoje</h4>
              <p className="text-xs text-[#A8A29A] mt-1">Clique no botão "Criar Novas Promoções" ao lado para que a inteligência artificial formule os combos ideais.</p>
            </div>
          )}

          {!loadingPromos && aiPromos && (
            <div className="space-y-6">
              {/* Combos Suggestion List */}
              <div className="bg-[#141210] p-7 rounded-2xl border border-[#2A211A] shadow-xs">
                <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-4 flex items-center gap-2">
                  <Flame className="text-amber-400 w-5 h-5" />
                  Combos Criados pela Inteligência Artificial
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {aiPromos.combos.map((combo: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-[#2A211A] bg-[#181512] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono bg-[#1F1209] text-[#FB923C] px-2.5 py-1 rounded-md font-bold uppercase border border-[#4A2A10]">
                            Desconto sugerido: {combo.discountPercent}%
                          </span>
                          <span className="text-[10px] text-[#A8A29A] font-mono font-bold">Combo #{idx + 1}</span>
                        </div>

                        <h4 className="text-sm font-bold text-[#F5F0EA] mt-4 leading-tight">{combo.name}</h4>
                        
                        {/* Products included */}
                        <div className="mt-3 space-y-1">
                          {combo.products.map((pName: string, pIdx: number) => (
                            <div key={pIdx} className="flex items-center gap-1.5 text-xs text-slate-300">
                              <span className="text-[#FB923C] font-bold">•</span>
                              <span className="font-medium">{pName}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-[#A8A29A] mt-3 leading-relaxed">{combo.description}</p>
                      </div>

                      <button
                        onClick={() => alert(`Combo "${combo.name}" adicionado com sucesso ao cardápio de combos!`)}
                        className="mt-4 w-full bg-[#141210] border border-[#2A211A] text-slate-200 hover:bg-[#2A211A] hover:text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#FB923C]" />
                        <span>Ativar Combo no Cardápio</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best Promotional Hours */}
              <div className="bg-[#141210] p-7 rounded-2xl border border-[#2A211A] shadow-xs">
                <h3 className="text-base font-display font-extrabold text-[#F5F0EA] mb-4 flex items-center gap-2">
                  <Clock className="text-amber-400 w-5 h-5" />
                  Horários Estratégicos Recomendados (Happy Hour Digital)
                </h3>
                <div className="space-y-3">
                  {aiPromos.bestHours.map((hour: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 bg-[#181512] p-3.5 rounded-xl border border-[#2A211A]">
                      <div className="w-6 h-6 rounded-full bg-[#1F1209] text-[#FB923C] border border-[#4A2A10] flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">{hour}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marketing strategy copy with copy clipboard button */}
              <div className="bg-[#141210] text-slate-100 p-7 rounded-2xl border border-[#2A211A] shadow-xs">
                <div className="flex items-center justify-between mb-4 border-b border-[#2A211A] pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#FB923C]" />
                    <h4 className="text-sm font-display font-extrabold text-[#F5F0EA] tracking-tight">Estratégia de Marketing e Copy</h4>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiPromos.marketingStrategy);
                      alert("Estratégia copiada com sucesso!");
                    }}
                    className="text-xs text-[#FB923C] hover:text-[#F97316] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Plano</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-[#181512] p-4 rounded-xl border border-[#2A211A]">
                  {aiPromos.marketingStrategy}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
