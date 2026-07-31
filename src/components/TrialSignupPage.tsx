import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SushiLogoEmblem } from './SushiIcons';
import { ArrowLeft, User, Phone, Mail, Lock, CreditCard, ShieldCheck } from 'lucide-react';

function formatBRPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function TrialSignupPage() {
  const { setPublicView, startBlankTrialAccount } = useApp();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Informe seu nome completo.';
    if (phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Informe um telefone válido com DDD.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) newErrors.email = 'Informe um e-mail válido.';
    if (password.length < 6) newErrors.password = 'A senha deve ter no mínimo 6 caracteres.';
    if (cardNumber.replace(/\D/g, '').length < 16) newErrors.cardNumber = 'Número do cartão inválido.';
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) newErrors.cardExpiry = 'Validade inválida (MM/AA).';
    if (cardCvc.replace(/\D/g, '').length < 3) newErrors.cardCvc = 'CVC inválido.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // TODO: os campos de cartão abaixo são apenas visuais (layout). Na integração
    // real, substituir por Stripe Elements (ou gateway equivalente) e nunca
    // enviar/armazenar número de cartão bruto — isso não deve ir pra produção assim.
    // TODO: conectar criação de conta real (backend/Supabase) aqui.
    console.log('Trial signup attempt:', { fullName, phone, email, password, cardNumber, cardExpiry, cardCvc });

    // Novo cliente entra com o workspace zerado (sem produtos/pedidos de exemplo)
    // para montar o cardápio do jeito dele.
    startBlankTrialAccount();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0A08] font-sans text-slate-100">
      <header className="border-b border-[#2A211A] px-6 h-18 flex items-center shrink-0">
        <button onClick={() => setPublicView('landing')} className="flex items-center gap-2.5 cursor-pointer">
          <SushiLogoEmblem size={34} />
          <span className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-lg">
            Ponto<span className="text-[#FB923C]"> japa</span>
          </span>
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16 bg-sushi-hero">
        <div className="w-full max-w-md">
          <button
            onClick={() => setPublicView('landing')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#A8A29A] hover:text-[#FB923C] transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o início
          </button>

          <div className="card-sushi p-8 sm:p-10 space-y-6">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-display font-extrabold text-[#F5F0EA]">Comece seu teste grátis</h1>
              <p className="text-xs text-[#A8A29A]">7 dias grátis, sem compromisso. Cancele quando quiser.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="trial-name" className="text-xs font-semibold text-[#A8A29A]">Nome completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="trial-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                {errors.fullName && <p className="text-[11px] text-red-400 font-medium">{errors.fullName}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="trial-phone" className="text-xs font-semibold text-[#A8A29A]">Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="trial-phone"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(formatBRPhone(e.target.value))}
                    placeholder="(11) 91234-5678"
                    className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                {errors.phone && <p className="text-[11px] text-red-400 font-medium">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="trial-email" className="text-xs font-semibold text-[#A8A29A]">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="trial-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@gmail.com"
                    className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-400 font-medium">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="trial-password" className="text-xs font-semibold text-[#A8A29A]">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="trial-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha"
                    className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                {errors.password && <p className="text-[11px] text-red-400 font-medium">{errors.password}</p>}
              </div>

              {/*
                TODO: seção de cartão apenas para layout/composição visual.
                Substituir por Stripe Elements (ou equivalente) na integração real —
                nunca enviar/armazenar número de cartão bruto em produção (PCI compliance).
              */}
              <div className="space-y-3 border-t border-[#2A211A] pt-5">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#FB923C]" />
                  <span className="text-xs font-semibold text-[#A8A29A]">Dados do cartão</span>
                </div>

                <div className="space-y-1.5">
                  <input
                    aria-label="Número do cartão"
                    type="text"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    className="input-sushi w-full px-3 py-2.5 text-sm"
                  />
                  {errors.cardNumber && <p className="text-[11px] text-red-400 font-medium">{errors.cardNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <input
                      aria-label="Validade"
                      type="text"
                      inputMode="numeric"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/AA"
                      className="input-sushi w-full px-3 py-2.5 text-sm"
                    />
                    {errors.cardExpiry && <p className="text-[11px] text-red-400 font-medium">{errors.cardExpiry}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      aria-label="CVC"
                      type="text"
                      inputMode="numeric"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="CVC"
                      className="input-sushi w-full px-3 py-2.5 text-sm"
                    />
                    {errors.cardCvc && <p className="text-[11px] text-red-400 font-medium">{errors.cardCvc}</p>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#1F1209] border border-[#4A2A10] rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 text-[#FB923C] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#A8A29A] leading-relaxed">
                  Seu cartão só será cobrado após os 7 dias de teste grátis. Cancele antes disso e não paga nada.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 btn-sushi-primary text-white text-sm font-bold cursor-pointer hover:scale-[1.02] transition-transform"
              >
                Começar teste grátis
              </button>
            </form>

            <p className="text-center text-xs text-[#A8A29A]">
              Já tem conta?{' '}
              <button
                onClick={() => setPublicView('login')}
                className="text-[#FB923C] font-semibold hover:underline cursor-pointer"
              >
                Fazer login
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
