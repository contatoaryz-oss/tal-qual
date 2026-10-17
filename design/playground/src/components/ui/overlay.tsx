import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { Button, IconButton } from './button';
import { CostBadge } from './display';
import { cn } from './cn';

/* ---------------- Dialog ---------------- */
export function Dialog({
  trigger, title, description, children, footer, size = 'md', open, onOpenChange,
}: {
  trigger?: ReactNode; title: string; description?: string; children?: ReactNode; footer?: ReactNode;
  size?: 'sm' | 'md'; open?: boolean; onOpenChange?: (o: boolean) => void;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-auto rounded-t-lg bg-surface p-6 shadow-lg',
            'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg',
            size === 'sm' ? 'sm:w-[400px]' : 'sm:w-[560px]',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-display text-lg font-bold text-text">{title}</DialogPrimitive.Title>
              {description && <DialogPrimitive.Description className="mt-1 text-sm text-text-muted">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Fechar" size="sm"><X className="size-4" aria-hidden /></IconButton>
            </DialogPrimitive.Close>
          </div>
          {children && <div className="mt-4">{children}</div>}
          {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Confirmação de custo antes de pesquisa ou geração paga (S10, S11, S15). */
export function CostConfirmDialog({
  trigger, what, cents, remainingCents,
}: { trigger: ReactNode; what: string; cents: number; remainingCents: number }) {
  const brl = (c: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c / 100);
  const over = cents > remainingCents;
  return (
    <Dialog
      trigger={trigger}
      size="sm"
      title="Confirmar o custo"
      description={what}
      footer={
        <>
          <DialogPrimitive.Close asChild><Button variant="secondary">Cancelar</Button></DialogPrimitive.Close>
          <Button variant="primary" disabled={over}>Confirmar e rodar</Button>
        </>
      }
    >
      <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
        <dt className="text-text-muted">Custo estimado</dt>
        <dd><CostBadge cents={cents} over={over} /></dd>
        <dt className="text-text-muted">Disponível no teto do mês</dt>
        <dd className="font-semibold text-text">{brl(remainingCents)}</dd>
      </dl>
    </Dialog>
  );
}

/* ---------------- Tooltip ---------------- */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content sideOffset={6} className="z-50 rounded-sm bg-surface-inverse px-2 py-1 text-xs text-text-inverse shadow-md">
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
