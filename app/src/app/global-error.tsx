'use client';

import './globals.css';
import AppError from './error';

// Erro no próprio layout raiz: mesma tela, com <html> próprio.
export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppError {...props} />
      </body>
    </html>
  );
}
