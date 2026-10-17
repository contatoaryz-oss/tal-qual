import Link from 'next/link';
import type { Metadata } from 'next';
import { InlineAlert } from '@/components/ui/display';
import { safeNext } from '@/lib/auth/urls';
import { SignInForm } from '../forms';

export const metadata: Metadata = { title: 'Entrar' };

const NOTICES: Record<string, { tone: 'success' | 'danger' | 'info'; title: string }> = {
  link: { tone: 'danger', title: 'Esse link expirou ou já foi usado. Peça outro.' },
  saiu: { tone: 'info', title: 'Você saiu.' },
  todos: { tone: 'info', title: 'Você saiu de todos os aparelhos.' },
  apagada: { tone: 'success', title: 'Conta apagada. Seus dados foram removidos.' },
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string; saiu?: string; conta?: string }> }) {
  const sp = await searchParams;
  const notice = sp.erro ? NOTICES.link : sp.conta === 'apagada' ? NOTICES.apagada : sp.saiu === 'todos' ? NOTICES.todos : sp.saiu ? NOTICES.saiu : null;
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold text-text">Entrar</h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">Acesse os clientes da sua agência.</p>
      {notice && <div className="mb-4"><InlineAlert tone={notice.tone} title={notice.title} /></div>}
      <SignInForm next={safeNext(sp.next)} />
      <p className="mt-6 text-center text-sm text-text-muted">
        Ainda não tem conta? <Link href="/criar-conta" className="font-medium text-link hover:underline">Criar conta</Link>
      </p>
    </>
  );
}
