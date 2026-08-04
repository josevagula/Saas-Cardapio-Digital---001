import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { SushiLogoEmblem } from './SushiIcons';
import { ArrowLeft, Mail, Lock } from 'lucide-react';

function mapLoginError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).';
  }
  if (lower.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  return message;
}

export default function LoginPage() {
  const { setPublicView, enterAdminDashboard } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Informe um e-mail válido.';
    }
    if (!password.trim()) {
      newErrors.password = 'A senha não pode estar vazia.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setFormError(mapLoginError(error.message));
      return;
    }

    enterAdminDashboard();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0C0A08] font-sans text-slate-100">
      <header className="border-b border-[#2A211A] px-6 h-18 flex items-center shrink-0">
        <button onClick={() => setPublicView('landing')} className="flex items-center gap-2.5 cursor-pointer">
          <SushiLogoEmblem size={34} />
          <span className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-lg">
            Zu<span className="text-[#FB923C]">shy</span>
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
              <h1 className="text-2xl font-display font-extrabold text-[#F5F0EA]">Entrar na sua conta</h1>
              <p className="text-xs text-[#A8A29A]">Acesse o painel do seu cardápio digital.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {formError && (
                <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2.5">
                  <p className="text-[11px] text-red-400 font-medium">{formError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-[#A8A29A]">E-mail</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-400 font-medium">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold text-[#A8A29A]">Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                  />
                </div>
                {errors.password && <p className="text-[11px] text-red-400 font-medium">{errors.password}</p>}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => console.log('TODO: fluxo de recuperação de senha ainda não implementado')}
                  className="text-xs font-semibold text-[#FB923C] hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 btn-sushi-primary text-white text-sm font-bold cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="text-center text-xs text-[#A8A29A]">
              Ainda não tem conta?{' '}
              <button
                onClick={() => setPublicView('trial')}
                className="text-[#FB923C] font-semibold hover:underline cursor-pointer"
              >
                Experimente 7 dias grátis
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
