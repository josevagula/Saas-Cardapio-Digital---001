import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { startCheckout } from '../lib/billing';
import { SushiLogoEmblem } from './SushiIcons';
import { ArrowLeft, User, Phone, Mail, Lock } from 'lucide-react';

function mapSignupError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('already registered') || lower.includes('already exists') || lower.includes('user already')) {
    return 'Já existe uma conta com esse e-mail. Faça login em vez de criar uma nova.';
  }
  if (lower.includes('password')) {
    return 'Senha muito fraca. Use pelo menos 6 caracteres.';
  }
  return message;
}

function formatBRPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function TrialSignupPage() {
  const { setPublicView } = useApp();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Informe seu nome completo.';
    if (phone.replace(/\D/g, '').length < 10) newErrors.phone = 'Informe um telefone válido com DDD.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) newErrors.email = 'Informe um e-mail válido.';
    if (password.length < 6) newErrors.password = 'A senha deve ter no mínimo 6 caracteres.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome: fullName, telefone: phone } }
    });

    if (error) {
      setLoading(false);
      setFormError(mapSignupError(error.message));
      return;
    }

    // A tabela profiles já é preenchida automaticamente por um trigger no banco
    // a partir dos metadados acima. Este upsert é só uma garantia extra para
    // quando já existe sessão ativa (ex: confirmação de e-mail desativada).
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, nome: fullName, telefone: phone });
      if (profileError) {
        console.warn('Perfil será preenchido pelo trigger (sem sessão ativa ainda):', profileError.message);
      }
    }

    // Sem sessão ativa aqui significa que a confirmação de e-mail está ligada
    // no projeto Supabase — não há como abrir o Checkout (que exige um token
    // de acesso) até o e-mail ser confirmado e a pessoa logar.
    if (!data.session) {
      setLoading(false);
      setFormError('Conta criada! Confirme seu e-mail e depois faça login para concluir a assinatura.');
      return;
    }

    // Conta criada e autenticada — vai direto para o Checkout do Stripe para
    // capturar o cartão e iniciar os 7 dias grátis. O painel só é liberado
    // depois que o webhook do Stripe confirmar a assinatura (ver
    // PlanRenewalOverlay e a coluna profiles.subscription_status).
    try {
      await startCheckout();
    } catch (err: any) {
      setLoading(false);
      setFormError(err.message || 'Conta criada, mas não foi possível abrir o pagamento agora. Faça login para tentar de novo.');
    }
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
              <p className="text-[11px] text-[#A8A29A]">Cartão necessário para iniciar — você só é cobrado após os 7 dias.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {formError && (
                <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-red-400 font-medium">{formError}</p>
                </div>
              )}

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 btn-sushi-primary text-white text-sm font-bold cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Abrindo pagamento...' : 'Continuar para o pagamento'}
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
