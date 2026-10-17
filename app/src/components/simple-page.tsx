import Link from 'next/link';
import { ThemeToggle } from '@/components/shell/shell';

/** Página fora do workspace (conta, senha), com o mesmo cabeçalho simples da lista de clientes. */
export function SimplePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-[var(--layout-header)] items-center justify-between border-b border-border bg-surface px-4 md:px-6">
        <Link href="/" className="rounded-sm font-display text-md font-extrabold text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Estúdio</Link>
        <ThemeToggle />
      </header>
      <main id="conteudo" className="mx-auto w-full max-w-2xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
