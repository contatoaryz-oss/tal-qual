import Link from 'next/link';
import type { Metadata } from 'next';
import { SignUpForm } from '../forms';

export const metadata: Metadata = { title: 'Criar conta' };

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-extrabold text-text">Criar conta</h1>
      <p className="mb-6 mt-1 text-sm text-text-muted">Cada conta tem a própria agência, com clientes que só ela vê.</p>
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-text-muted">
        Já tem conta? <Link href="/entrar" className="font-medium text-link hover:underline">Entrar</Link>
      </p>
    </>
  );
}
