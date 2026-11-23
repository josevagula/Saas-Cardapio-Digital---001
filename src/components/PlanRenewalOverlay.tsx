import React, { useState } from 'react';
import { Lock, ShieldCheck, LogOut, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { SushiLogoEmblem } from './SushiIcons';

const onlyDigits = (v: string) => v.replace(/\D/g, '');

const formatCardNumber = (v: string) => onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatExpiry = (v: string) => {
  const d = onlyDigits(v).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};

const formatCpfCnpj = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const formatCep = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};

const inputClass =
  'w-full px-3 py-2.5 bg-[#0C0A08] border border-[#2A211A] rounded-lg text-sm text-white placeholder-[#6B655C] focus:outline-none focus:border-[#FB923C] transition-colors';
const labelClass = 'block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A8A29A] mb-1';

export default function PlanRenewalOverlay() {
  const { renewPlan, setLoggedIn, setCurrentView, subscriptionStatusRaw, confirmingCheckout } = useApp();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [holderName, setHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [ccv, setCcv] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [addressNumber, setAddressNumber] = useState('');

  // 'incomplete' is a brand-new account that never subscribed: it gets the
  // 7 free days. Anyone else (cancelled / overdue) is renewing and pays today.
  const neverSubscribed = subscriptionStatusRaw === 'incomplete';
  const firstCharge = new Date();
  firstCharge.setDate(firstCharge.getDate() + 7);
  const firstChargeLabel = firstCharge.toLocaleDateString('pt-BR');

  const validate = () => {
    if (!holderName.trim()) return 'Informe o nome impresso no cartão.';
    const num = onlyDigits(cardNumber);
    if (num.length < 13) return 'Número do cartão incompleto.';
    const exp = onlyDigits(expiry);
    const month = Number(exp.slice(0, 2));
    if (exp.length !== 4 || month < 1 || month > 12) return 'Validade inválida. Use MM/AA.';
    if (onlyDigits(ccv).length < 3) return 'CVV inválido.';
    const doc = onlyDigits(cpfCnpj);
    if (doc.length !== 11 && doc.length !== 14) return 'Informe um CPF ou CNPJ válido.';
    if (onlyDigits(cep).length !== 8) return 'Informe um CEP válido.';
    if (!addressNumber.trim()) return 'Informe o número do endereço.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const exp = onlyDigits(expiry);
      // On success the subscription status reloads and this overlay unmounts.
      await renewPlan({
        holderName: holderName.trim(),
        number: onlyDigits(cardNumber),
        expiryMonth: exp.slice(0, 2),
        expiryYear: `20${exp.slice(2)}`,
        ccv: onlyDigits(ccv),
        cpfCnpj: onlyDigits(cpfCnpj),
        postalCode: onlyDigits(cep),
        addressNumber: addressNumber.trim(),
      });
    } catch (err: any) {
      setError(err.message || 'Não foi possível concluir o pagamento agora. Tente novamente.');
      setLoading(false);
    }
  };

  // Came back from the old hosted Asaas Checkout: wait for its confirmation
  // instead of asking for the card again.
  if (confirmingCheckout) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans">
        <div className="bg-[#141210] border border-[#2A211A] rounded-2xl w-full max-w-sm p-8 text-center text-slate-100 shadow-2xl">
          <div className="w-8 h-8 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-base font-black text-[#F5F0EA] font-display">Confirmando seu cartão…</h2>
          <p className="text-xs text-[#A8A29A] mt-2">Isso leva só alguns segundos. Seu painel será liberado automaticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-sans overflow-y-auto">
      <div className="bg-[#141210] border border-[#2A211A] rounded-2xl w-full max-w-md shadow-2xl text-slate-100 flex flex-col relative my-auto">

        <div className="px-6 pt-6 pb-5 text-center bg-gradient-to-b from-[#1F1209] to-[#141210] border-b border-[#2A211A] rounded-t-2xl">
          <div className="flex items-center justify-center gap-2 mb-1">
            <SushiLogoEmblem size={20} />
            <h2 className="text-lg font-black text-[#F5F0EA] font-display">
              {neverSubscribed ? 'Ative seus 7 dias grátis' : 'Renove seu plano'}
            </h2>
          </div>
          <p className="text-xs text-[#A8A29A] mt-1">
            {neverSubscribed
              ? `Nada é cobrado hoje. A primeira cobrança de R$ 127 será em ${firstChargeLabel}. Cancele quando quiser antes disso.`
              : 'A cobrança de R$ 127 é feita hoje no cartão e o painel é liberado na hora. Seus dados continuam salvos.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5" autoComplete="on">
          <div>
            <label className={labelClass} htmlFor="cc-name">Nome impresso no cartão</label>
            <input id="cc-name" autoComplete="cc-name" className={inputClass} placeholder="Como está no cartão"
              value={holderName} onChange={e => setHolderName(e.target.value.toUpperCase())} />
          </div>

          <div>
            <label className={labelClass} htmlFor="cc-number">Número do cartão</label>
            <div className="relative">
              <input id="cc-number" autoComplete="cc-number" inputMode="numeric" className={`${inputClass} pr-10`}
                placeholder="0000 0000 0000 0000" value={cardNumber} onChange={e => setCardNumber(formatCardNumber(e.target.value))} />
              <CreditCard className="w-4 h-4 text-[#6B655C] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="cc-exp">Validade</label>
              <input id="cc-exp" autoComplete="cc-exp" inputMode="numeric" className={inputClass} placeholder="MM/AA"
                value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cc-csc">CVV</label>
              <input id="cc-csc" autoComplete="cc-csc" inputMode="numeric" className={inputClass} placeholder="123"
                value={ccv} onChange={e => setCcv(onlyDigits(e.target.value).slice(0, 4))} />
            </div>
          </div>

          <div className="pt-1">
            <p className="text-[10px] text-[#6B655C] mb-2">Dados do titular do cartão (exigidos pelo banco)</p>
            <div className="space-y-3.5">
              <div>
                <label className={labelClass} htmlFor="cpf-cnpj">CPF ou CNPJ</label>
                <input id="cpf-cnpj" inputMode="numeric" className={inputClass} placeholder="000.000.000-00"
                  value={cpfCnpj} onChange={e => setCpfCnpj(formatCpfCnpj(e.target.value))} />
              </div>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <div>
                  <label className={labelClass} htmlFor="cep">CEP</label>
                  <input id="cep" autoComplete="postal-code" inputMode="numeric" className={inputClass} placeholder="00000-000"
                    value={cep} onChange={e => setCep(formatCep(e.target.value))} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="addr-number">Número</label>
                  <input id="addr-number" className={inputClass} placeholder="123"
                    value={addressNumber} onChange={e => setAddressNumber(e.target.value.slice(0, 10))} />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2.5">
              <p className="text-[11px] text-red-400 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C2410C] via-[#EA580C] to-[#F97316] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all cursor-pointer disabled:opacity-70"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Processando…</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>{neverSubscribed ? 'Começar teste grátis' : 'Pagar R$ 127 e liberar'}</span>
              </>
            )}
          </button>

          <div className="flex items-start gap-2 text-[10px] text-[#8A7E72]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F97316] shrink-0 mt-px" />
            <span>Pagamento seguro processado pelo Asaas. O Zushy não guarda os dados do seu cartão.</span>
          </div>
        </form>

        <div className="px-6 pb-5">
          <button
            type="button"
            onClick={async () => {
              await logout();
              setLoggedIn(false);
              setCurrentView('home');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] text-[#A8A29A] hover:text-[#F5F0EA] transition-all font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Sessão</span>
          </button>
        </div>
      </div>
    </div>
  );
}
