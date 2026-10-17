import Link from 'next/link';
import type { Metadata } from 'next';
import { ForgotForm } from '../forms';

export const metadata: Metadata = { title: 'Esqueci a senha' };

export default function ForgotPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold text-text">Esqueci a senha</h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">Mandamos um link para você criar uma senha nova.</p>
      <ForgotForm />
      <p className="mt-6 text-center text-sm"><Link href="/entrar" className="font-medium text-link hover:underline">Voltar para entrar</Link></p>
    </>
  );
}
