import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { flushPendingTermsAcceptance, sendTermsCopy } from '../lib/terms';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Grava o aceite dos Termos que ficou pendente no cadastro (e-mail por
      // confirmar ou insert que falhou). setTimeout evita chamar o Supabase
      // de dentro do callback de auth, o que pode travar o cliente.
      // No login, também pede o reenvio da cópia dos Termos por e-mail, caso o
      // envio do cadastro tenha falhado (a função não duplica e-mails).
      if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const userId = newSession.user.id;
        setTimeout(async () => {
          await flushPendingTermsAcceptance(userId);
          if (event === 'SIGNED_IN') await sendTermsCopy();
        }, 0);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
