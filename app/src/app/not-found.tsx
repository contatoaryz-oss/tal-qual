import Link from 'next/link';
import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button-styles';

export const metadata: Metadata = { title: 'Não encontrado' };

export default function NotFound() {
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text" aria-hidden><SearchX className="size-6" /></span>
        <h1 className="font-display text-2xl font-extrabold text-text">Não encontramos esta página</h1>
        <p className="text-md text-text-muted">O endereço pode estar errado, ou isto foi apagado, ou pertence a outra conta.</p>
        <Link href="/" className={buttonStyles({ variant: 'primary' })}>Ir para os clientes</Link>
      </div>
    </main>
  );
}
