import type { ReactNode } from 'react';
import { cn, focusRing } from './cn';
import { Badge } from './display';

/** Card de entidade (ICP, oferta, concorrente, anunciante). O card todo é link; ações são botões fora do link. */
export function EntityCard({
  href, title, subtitle, meta = [], actions, selected, draft,
}: {
  href: string; title: string; subtitle?: string; meta?: string[];
  actions?: ReactNode; selected?: boolean; draft?: boolean;
}) {
  return (
    <article
      className={cn(
        'relative flex flex-col gap-2 rounded-lg border bg-surface p-4 shadow-sm transition-shadow duration-[var(--duration-base)] hover:shadow-md',
        selected ? 'border-2 border-primary' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-md font-semibold text-text">
          <a href={href} className={cn('rounded-sm after:absolute after:inset-0 after:content-[""]', focusRing)}>
            {title}
          </a>
        </h3>
        {draft && <Badge tone="neutral" size="sm">rascunho</Badge>}
      </div>
      {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
      {meta.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
          {meta.map((m) => <li key={m}>{m}</li>)}
        </ul>
      )}
      {actions && <div className="relative z-10 mt-1 flex gap-1">{actions}</div>}
    </article>
  );
}

/** Item da sidebar. Ativo: fundo accent-subtle + barra amarela à esquerda. */
export function NavItem({ href, icon, label, active, count }: { href: string; icon: ReactNode; label: string; active?: boolean; count?: number }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium',
        active
          ? 'bg-accent-subtle text-on-accent-subtle before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent'
          : 'text-text-muted hover:bg-surface-2 hover:text-text',
        focusRing,
      )}
    >
      <span aria-hidden className="[&>svg]:size-[18px]">{icon}</span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs tabular-nums">{count}</span>}
    </a>
  );
}
