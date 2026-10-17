'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RotateCcw, WifiOff, TriangleAlert } from 'lucide-react';
import { buttonStyles } from '@/components/ui/button-styles';

/**
 * Tela de erro do app (antes caía na página branca do Next, em inglês).
 * Sem conexão vira uma mensagem própria; o resto mostra o código para o suporte.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const isNet = typeof navigator !== 'undefined' && (!navigator.onLine || /failed to fetch|network|load failed/i.test(error.message));
    setOffline(isNet);
    const back = () => setOffline(false);
    window.addEventListener('online', back);
    return () => window.removeEventListener('online', back);
  }, [error]);

  const Icon = offline ? WifiOff : TriangleAlert;
  return (
    <main id="conteudo" className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div role="alert" className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-text" aria-hidden><Icon className="size-6" /></span>
        <h1 className="font-display text-2xl font-extrabold text-text">{offline ? 'Sem conexão' : 'Algo deu errado'}</h1>
        <p className="text-md text-text-muted">
          {offline
            ? 'Parece que a internet caiu. Confira a conexão e tente de novo. Nada foi salvo pela metade.'
            : 'Não conseguimos concluir isso. Tente de novo; se continuar, volte para a lista de clientes.'}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => reset()} className={buttonStyles({ variant: 'primary' })}>
            <RotateCcw className="size-4" aria-hidden /> Tentar de novo
          </button>
          <Link href="/" className={buttonStyles({ variant: 'secondary' })}>Ir para os clientes</Link>
        </div>
        {error.digest && !offline && <p className="text-xs text-text-muted">Código do erro: {error.digest}</p>}
      </div>
    </main>
  );
}
