'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  BarChart3, BookOpen, Bot, CalendarDays, Check, ChevronsUpDown, Gauge, Images, Layers, Lightbulb, Megaphone,
  Menu, Moon, Clock, Palette, Plus, Sparkles, Sun, Swords, TrendingUp, Users, Wand2, X, ArrowLeftRight,
} from 'lucide-react';
import { cn, focusRing } from '@/components/ui/cn';
import { IconButton } from '@/components/ui/button';
import { NAV_GROUPS, SCREENS } from '@/lib/nav';

const ICONS: Record<string, ReactNode> = {
  palette: <Palette />, book: <BookOpen />, users: <Users />, layers: <Layers />, swords: <Swords />,
  megaphone: <Megaphone />, trending: <TrendingUp />, chart: <BarChart3 />, lightbulb: <Lightbulb />, bot: <Bot />,
  wand: <Wand2 />, images: <Images />, gauge: <Gauge />, swipe: <ArrowLeftRight />, calendar: <CalendarDays />, sparkles: <Sparkles />,
};

export interface ShellWorkspace { slug: string; name: string; status: 'onboarding' | 'ready' | 'archived' }

function Initials({ name }: { name: string }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary font-display text-xs font-extrabold text-on-primary" aria-hidden>
      {ini}
    </span>
  );
}

function Nav({ slug, live, onNavigate }: { slug: string; live: Set<string>; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1 p-3">
      {NAV_GROUPS.map((group) => (
        <div key={group} className="flex flex-col gap-1">
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-text-muted first:pt-2">{group}</p>
          {SCREENS.filter((s) => s.nav?.group === group).map((s) => {
            const href = s.path(slug);
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={s.id}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium',
                  active
                    ? 'bg-accent-subtle text-on-accent-subtle before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text',
                  focusRing,
                )}
              >
                <span aria-hidden className="[&>svg]:size-[18px]">{ICONS[s.nav!.icon]}</span>
                <span className="flex-1 truncate">{s.title}</span>
                {!live.has(s.id) && (
                  <span title="Em breve" className="text-text-muted">
                    <Clock className="size-3.5" aria-hidden />
                    <span className="sr-only">(em breve)</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function WorkspaceSwitcher({ current, workspaces }: { current: ShellWorkspace; workspaces: ShellWorkspace[] }) {
  const router = useRouter();
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Cliente atual: ${current.name}. Trocar de cliente`}
        className={cn('flex h-10 min-w-0 max-w-[280px] items-center gap-2 rounded-md px-2 hover:bg-surface-2', focusRing)}
      >
        <Initials name={current.name} />
        <span className="truncate text-sm font-semibold text-text">{current.name}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-text-muted" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-50 w-72 rounded-md border border-border bg-surface p-1 shadow-lg">
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold text-text-muted">Clientes</DropdownMenu.Label>
          {workspaces.map((w) => (
            <DropdownMenu.Item
              key={w.slug}
              onSelect={() => router.push(`/w/${w.slug}/marca`)}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
            >
              <Initials name={w.name} />
              <span className="flex-1 truncate">{w.name}</span>
              {w.status === 'onboarding' && <span className="text-xs text-text-muted">lendo…</span>}
              {w.slug === current.slug && <Check className="size-4 text-primary" aria-label="atual" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={() => router.push('/novo')}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm font-medium text-text outline-none data-[highlighted]:bg-surface-2"
          >
            <Plus className="size-4" aria-hidden /> Novo cliente
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => router.push('/')}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-text outline-none data-[highlighted]:bg-surface-2"
          >
            <Users className="size-4" aria-hidden /> Ver todos os clientes
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  useEffect(() => {
    const t = document.documentElement.dataset.theme as 'light' | 'dark' | undefined;
    setTheme(t ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  }, []);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <IconButton
      label={next === 'dark' ? 'Usar tema escuro' : 'Usar tema claro'}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try { localStorage.setItem('theme', next); } catch {}
        setTheme(next);
      }}
    >
      {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </IconButton>
  );
}

export function AppShell({
  current, workspaces, liveScreens, children,
}: { current: ShellWorkspace; workspaces: ShellWorkspace[]; liveScreens: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const live = new Set(liveScreens);
  return (
    <div className="min-h-dvh bg-bg">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-text">
        Pular para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-[var(--layout-sidebar)] overflow-y-auto border-r border-border bg-surface lg:block">
        <div className="flex h-[var(--layout-header)] items-center border-b border-border px-5">
          <Link href="/" className={cn('font-display text-md font-extrabold text-text', focusRing)}>Estúdio</Link>
        </div>
        <Nav slug={current.slug} live={live} />
      </aside>

      <div className="lg:pl-[var(--layout-sidebar)]">
        <header className="sticky top-0 z-30 flex h-[var(--layout-header)] items-center gap-2 border-b border-border bg-surface px-4 md:px-6">
          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger asChild>
              <IconButton label="Abrir menu" className="lg:hidden"><Menu className="size-5" aria-hidden /></IconButton>
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay lg:hidden" />
              <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[min(var(--layout-sidebar),85vw)] overflow-y-auto bg-surface shadow-lg lg:hidden">
                <div className="flex h-[var(--layout-header)] items-center justify-between border-b border-border px-4">
                  <DialogPrimitive.Title className="font-display text-md font-extrabold text-text">Menu</DialogPrimitive.Title>
                  <DialogPrimitive.Close asChild><IconButton label="Fechar menu"><X className="size-5" aria-hidden /></IconButton></DialogPrimitive.Close>
                </div>
                <Nav slug={current.slug} live={live} onNavigate={() => setOpen(false)} />
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
          <WorkspaceSwitcher current={current} workspaces={workspaces} />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[var(--layout-content-max)] px-4 py-6 outline-none md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
