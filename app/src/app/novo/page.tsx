import Link from 'next/link';
import type { Metadata } from 'next';
import { NewClientForm } from './form';

export const metadata: Metadata = { title: 'Novo cliente' };

export default function NewClientPage() {
  return (
    <div className="flex min-h-dvh items-start justify-center bg-bg px-4 py-12 md:items-center">
      <main id="conteudo" className="w-full max-w-lg">
        <Link href="/" className="mb-6 inline-block rounded-sm text-sm font-medium text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          ← Clientes
        </Link>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">
          <h1 className="font-display text-2xl font-extrabold text-text">Novo cliente</h1>
          <p className="mt-2 text-md text-text-muted">
            Cole o site ou o @ do Instagram. A ferramenta lê o que o negócio mostra e monta um rascunho da marca para você revisar.
          </p>
          <NewClientForm />
        </div>
      </main>
    </div>
  );
}
