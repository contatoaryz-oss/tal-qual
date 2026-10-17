import Link from 'next/link';
import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/display';
import { buttonStyles } from '@/components/ui/button-styles';
import { screen, type ScreenId } from '@/lib/nav';

/** Telas do fluxo principal que já funcionam. As outras mostram o stub com o marco em que entram. */
export const LIVE_SCREENS = ['S01', 'S02', 'S03', 'S05', 'S06', 'S07', 'S08', 'S15', 'S16', 'S17', 'S18', 'S22'];

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block rounded-sm text-sm font-medium text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            ← {back.label}
          </Link>
        )}
        <h1 className="break-words font-display text-2xl font-extrabold text-text md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-md text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function ComingSoon({ id, slug }: { id: ScreenId; slug: string }) {
  const s = screen(id);
  return (
    <>
      <PageHeader title={s.title} />
      <EmptyState
        icon={<Construction className="size-7" />}
        title={`Esta tela entra no marco ${s.milestone}`}
        body={`${s.id} está mapeada no recon e planejada na arquitetura. Por enquanto o fluxo principal é Marca → Personas → Ofertas → Criar → Galeria.`}
        action={<Link href={`/w/${slug}/criar`} className={buttonStyles({ variant: 'secondary' })}>Ir para Criar</Link>}
      />
    </>
  );
}

export function Section({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-6" aria-label={title}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-text">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
