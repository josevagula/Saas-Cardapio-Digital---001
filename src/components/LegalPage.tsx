import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SushiLogoEmblem } from './SushiIcons';
import { PRIVACY_POLICY, TERMS_OF_USE, type LegalBlock } from '../data/legalDocs';

const EMAIL = 'zushy.br@gmail.com';

// Deixa o e-mail de contato clicável onde aparecer no texto.
function withEmailLinks(text: string) {
  const parts = text.split(EMAIL);
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <a href={`mailto:${EMAIL}`} className="text-[#FB923C] underline underline-offset-2 hover:text-[#FDBA74]">
          {EMAIL}
        </a>
      )}
    </React.Fragment>
  ));
}

function Lead({ lead }: { lead?: string }) {
  if (!lead) return null;
  return <strong className="font-semibold text-[#F5F0EA]">{lead} </strong>;
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === 'p') {
    return (
      <p>
        <Lead lead={block.lead} />
        {withEmailLinks(block.text)}
      </p>
    );
  }
  if (block.type === 'ul') {
    return (
      <ul className="space-y-2.5 pl-5 list-disc marker:text-[#6B635A]">
        {block.items.map((item, i) => (
          <li key={i} className="pl-1">
            <Lead lead={item.lead} />
            {withEmailLinks(item.text)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <>
      {/* Tabela no desktop */}
      <div className="hidden sm:block overflow-hidden rounded-xl border border-[#2A211A]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#141210] text-[#F5F0EA]">
            <tr>
              {block.head.map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold align-bottom">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A211A]">
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={`px-4 py-3 align-top ${c === 0 ? 'font-medium text-[#F5F0EA]' : ''}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* No celular, cada linha vira um bloco com os rótulos da tabela */}
      <div className="sm:hidden space-y-3">
        {block.rows.map((row, r) => (
          <dl key={r} className="rounded-xl border border-[#2A211A] bg-[#141210] p-4 space-y-2 text-sm">
            <dt className="font-semibold text-[#F5F0EA]">{row[0]}</dt>
            {row.slice(1).map((cell, c) => (
              <dd key={c}>
                <span className="block text-xs text-[#8A837A]">{block.head[c + 1]}</span>
                {cell}
              </dd>
            ))}
          </dl>
        ))}
      </div>
    </>
  );
}

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { setPublicView } = useApp();
  const doc = kind === 'terms' ? TERMS_OF_USE : PRIVACY_POLICY;
  const other = kind === 'terms'
    ? { view: 'privacy' as const, href: '/privacidade', label: 'Política de Privacidade' }
    : { view: 'terms' as const, href: '/termos', label: 'Termos de Uso' };

  useEffect(() => {
    document.title = `${kind === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'} | Zushy`;
    window.scrollTo(0, 0);
    return () => { document.title = 'Zushy'; };
  }, [kind]);

  const go = (view: 'landing' | 'terms' | 'privacy') => (e: React.MouseEvent) => {
    e.preventDefault();
    // Logado, o AppContext não mexe na URL das telas públicas; garante aqui.
    const path = view === 'terms' ? '/termos' : view === 'privacy' ? '/privacidade' : null;
    if (path && window.location.pathname !== path) window.history.pushState(null, '', path);
    setPublicView(view);
  };

  return (
    <div className="min-h-dvh bg-[#0C0A08] font-sans text-[#C9C2B8]">
      <header className="border-b border-[#2A211A]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <a href="/" onClick={go('landing')} className="flex items-center gap-2.5" aria-label="Zushy, voltar ao início">
            <SushiLogoEmblem size={30} />
            <span className="font-display font-extrabold text-[#F5F0EA] tracking-tight text-lg">
              Zu<span className="text-[#FB923C]">shy</span>
            </span>
          </a>
          <a
            href="/"
            onClick={go('landing')}
            className="inline-flex items-center gap-1.5 text-sm text-[#A8A29A] hover:text-[#FB923C] transition-colors py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="font-display font-extrabold text-[#F5F0EA] text-3xl sm:text-4xl tracking-tight leading-tight">
          {doc.title}
        </h1>
        <p className="mt-3 text-sm text-[#8A837A]">{doc.updated}</p>

        <div className="mt-10 space-y-10 text-[15px] leading-7">
          {doc.sections.map((section) => (
            <section key={section.title} className="space-y-4">
              <h2 className="font-display font-bold text-[#F5F0EA] text-xl leading-snug">{section.title}</h2>
              {section.blocks.map((block, i) => <Block key={i} block={block} />)}
            </section>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-[#2A211A] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
          <a href={other.href} onClick={go(other.view)} className="text-[#FB923C] hover:text-[#FDBA74] transition-colors">
            Ler {other.label === 'Termos de Uso' ? 'os' : 'a'} {other.label}
          </a>
          <p className="text-xs text-[#8A837A]">© 2026 Zushy. Todos os direitos reservados.</p>
        </div>
      </main>
    </div>
  );
}
