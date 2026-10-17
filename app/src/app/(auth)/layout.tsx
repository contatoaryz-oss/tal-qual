import { ThemeToggle } from '@/components/shell/shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-[var(--layout-header)] items-center justify-between px-4 md:px-6">
        <span className="font-display text-md font-extrabold text-text">Estúdio</span>
        <ThemeToggle />
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pb-12 pt-6 md:items-center md:pt-0">
        <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-sm md:p-8">{children}</div>
      </main>
    </div>
  );
}
