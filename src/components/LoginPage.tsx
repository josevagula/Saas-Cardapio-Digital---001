import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { SushiLogoEmblem } from './SushiIcons';
import { ArrowLeft, Mail, Lock, KeyRound } from 'lucide-react';

function getErrorMessage(error: unknown, fallback: string): string {
  console.error(error);

  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    // auth-js's AuthRetryableFetchError (used for 5xx responses) sometimes
    // sets .message to the literal string "{}" instead of the server's
    // actual error body, so that's not a usable message either.
    if (typeof msg === 'string' && msg.trim().length > 0 && msg.trim() !== '{}') {
      return msg;
    }
  }
  return fallback;
}

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

function mapResetRequestError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('security purposes') || lower.includes('rate limit')) {
    return 'Aguarde alguns segundos antes de solicitar um novo código.';
  }
  return message;
}

function mapVerifyOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('expired') || lower.includes('invalid')) {
    return 'Código inválido ou expirado. Solicite um novo código.';
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

  const [step, setStep] = useState<'login' | 'forgot-request' | 'forgot-reset'>('login');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotInfo, setForgotInfo] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetErrors, setResetErrors] = useState<{ otp?: string; newPassword?: string; confirmPassword?: string }>({});
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const openForgotPassword = () => {
    setForgotEmail(email);
    setForgotEmailError('');
    setForgotError('');
    setForgotInfo('');
    setStep('forgot-request');
  };

  const backToLogin = () => {
    setStep('login');
    setFormError('');
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotInfo('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setForgotEmailError('Informe um e-mail válido.');
      return;
    }
    setForgotEmailError('');

    setForgotLoading(true);

    const { data: exists, error: lookupError } = await supabase.rpc('email_has_account', {
      check_email: forgotEmail,
    });

    if (lookupError) {
      setForgotLoading(false);
      setForgotError(getErrorMessage(lookupError, 'Não foi possível verificar o e-mail. Tente novamente.'));
      return;
    }

    if (!exists) {
      setForgotLoading(false);
      setForgotEmailError('Não encontramos nenhuma conta com esse e-mail.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
    setForgotLoading(false);

    if (error) {
      setForgotError(mapResetRequestError(getErrorMessage(error, 'Não foi possível enviar o código. Tente novamente.')));
      return;
    }

    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setResetErrors({});
    setResetError('');
    setResendCooldown(15);
    setStep('forgot-reset');
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setForgotError('');
    setResetError('');
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
    setForgotLoading(false);

    if (error) {
      setResetError(mapResetRequestError(getErrorMessage(error, 'Não foi possível reenviar o código. Tente novamente.')));
      return;
    }
    setResendCooldown(15);
    setForgotInfo('Enviamos um novo código para o seu e-mail.');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    const newErrors: { otp?: string; newPassword?: string; confirmPassword?: string } = {};
    if (!/^\d{6}$/.test(otp)) {
      newErrors.otp = 'Informe o código de 6 dígitos enviado por e-mail.';
    }
    if (newPassword.length < 6) {
      newErrors.newPassword = 'A senha deve ter no mínimo 6 caracteres.';
    }
    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem.';
    }
    setResetErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setResetLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: forgotEmail,
      token: otp,
      type: 'recovery',
    });

    if (verifyError) {
      setResetLoading(false);
      setResetError(mapVerifyOtpError(getErrorMessage(verifyError, 'Não foi possível validar o código. Tente novamente.')));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setResetLoading(false);

    if (updateError) {
      setResetError(getErrorMessage(updateError, 'Não foi possível redefinir a senha. Tente novamente.'));
      return;
    }

    enterAdminDashboard();
  };

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
      setFormError(mapLoginError(getErrorMessage(error, 'Não foi possível entrar. Tente novamente.')));
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

          {step === 'login' && (
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
                    onClick={openForgotPassword}
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
          )}

          {step === 'forgot-request' && (
            <div className="card-sushi p-8 sm:p-10 space-y-6">
              <div className="space-y-1.5 text-center">
                <h1 className="text-2xl font-display font-extrabold text-[#F5F0EA]">Recuperar senha</h1>
                <p className="text-xs text-[#A8A29A]">Informe seu e-mail para receber um código de verificação de 6 dígitos.</p>
              </div>

              <form onSubmit={handleSendCode} className="space-y-5" noValidate>
                {forgotError && (
                  <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-red-400 font-medium">{forgotError}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-xs font-semibold text-[#A8A29A]">E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                  {forgotEmailError && <p className="text-[11px] text-red-400 font-medium">{forgotEmailError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 btn-sushi-primary text-white text-sm font-bold cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>

              <p className="text-center text-xs text-[#A8A29A]">
                <button onClick={backToLogin} className="text-[#FB923C] font-semibold hover:underline cursor-pointer">
                  Voltar para o login
                </button>
              </p>
            </div>
          )}

          {step === 'forgot-reset' && (
            <div className="card-sushi p-8 sm:p-10 space-y-6">
              <div className="space-y-1.5 text-center">
                <h1 className="text-2xl font-display font-extrabold text-[#F5F0EA]">Digite o código</h1>
                <p className="text-xs text-[#A8A29A]">
                  Enviamos um código de 6 dígitos para <span className="text-[#F5F0EA] font-semibold">{forgotEmail}</span>.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
                {resetError && (
                  <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-red-400 font-medium">{resetError}</p>
                  </div>
                )}
                {forgotInfo && (
                  <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] text-emerald-400 font-medium">{forgotInfo}</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="otp-code" className="text-xs font-semibold text-[#A8A29A]">Código de verificação</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm tracking-[0.3em]"
                    />
                  </div>
                  {resetErrors.otp && <p className="text-[11px] text-red-400 font-medium">{resetErrors.otp}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="text-xs font-semibold text-[#A8A29A]">Nova senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                  {resetErrors.newPassword && <p className="text-[11px] text-red-400 font-medium">{resetErrors.newPassword}</p>}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="text-xs font-semibold text-[#A8A29A]">Confirmar nova senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#A8A29A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-sushi w-full pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                  {resetErrors.confirmPassword && <p className="text-[11px] text-red-400 font-medium">{resetErrors.confirmPassword}</p>}
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 btn-sushi-primary text-white text-sm font-bold cursor-pointer hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {resetLoading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>

              <div className="flex items-center justify-between text-xs">
                <button onClick={backToLogin} className="text-[#A8A29A] font-semibold hover:text-[#FB923C] transition-colors cursor-pointer">
                  Voltar para o login
                </button>
                <button
                  onClick={handleResendCode}
                  disabled={forgotLoading || resendCooldown > 0}
                  className="text-[#FB923C] font-semibold hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:no-underline"
                >
                  {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
