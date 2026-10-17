import type { ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, Check, CircleAlert, CircleDollarSign, Info, Loader2, Minus, X } from 'lucide-react';
import { cn } from './cn';

/* ---------------- Badge ---------------- */
const badge = cva('inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-text-muted',
      accent: 'bg-accent text-on-accent',
      success: 'bg-success-subtle text-success',
      warning: 'bg-warning-subtle text-warning',
      danger: 'bg-danger-subtle text-danger',
      primary: 'bg-primary text-on-primary',
    },
    size: { sm: 'h-5 px-2 text-xs', md: 'h-6 px-2.5 text-xs' },
  },
  defaultVariants: { tone: 'neutral', size: 'md' },
});

export function Badge({ tone, size, icon, children }: VariantProps<typeof badge> & { icon?: ReactNode; children: ReactNode }) {
  return <span className={badge({ tone, size })}>{icon}{children}</span>;
}

/* ---------------- CostBadge ---------------- */
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function CostBadge({ cents, over }: { cents: number; over?: boolean }) {
  const free = cents === 0;
  const text = free ? 'grátis' : `≈ ${brl.format(cents / 100)}`;
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold',
        free ? 'bg-surface-2 text-text-muted' : over ? 'bg-danger-subtle text-danger' : 'bg-accent-subtle text-on-accent-subtle',
      )}
    >
      <CircleDollarSign className="size-3.5" aria-hidden />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{free ? 'sem custo' : `custo estimado de ${brl.format(cents / 100)}`}{over ? ', acima do teto mensal' : ''}</span>
    </span>
  );
}

/* ---------------- InlineAlert ---------------- */
const alertTone = {
  info: { cls: 'bg-surface-2 text-text', icon: Info },
  success: { cls: 'bg-success-subtle text-success', icon: Check },
  warning: { cls: 'bg-warning-subtle text-warning', icon: AlertTriangle },
  danger: { cls: 'bg-danger-subtle text-danger', icon: CircleAlert },
} as const;

export function InlineAlert({ tone = 'info', title, children }: { tone?: keyof typeof alertTone; title: string; children?: ReactNode }) {
  const { cls, icon: Icon } = alertTone[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-md p-3 text-sm', cls)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

/* ---------------- ProgressStepper ---------------- */
export type StepState = 'pending' | 'running' | 'done' | 'failed' | 'skipped';
const stepLabel: Record<StepState, string> = {
  pending: 'pendente', running: 'em andamento', done: 'concluído', failed: 'falhou', skipped: 'pulado',
};

function StepIcon({ state }: { state: StepState }) {
  const base = 'flex size-6 shrink-0 items-center justify-center rounded-full';
  switch (state) {
    case 'done': return <span className={cn(base, 'bg-success text-surface')}><Check className="size-3.5" strokeWidth={3} aria-hidden /></span>;
    case 'running': return <span className={cn(base, 'border-2 border-primary')}><Loader2 className="size-3.5 animate-spin text-primary" aria-hidden /></span>;
    case 'failed': return <span className={cn(base, 'bg-danger text-surface')}><X className="size-3.5" strokeWidth={3} aria-hidden /></span>;
    case 'skipped': return <span className={cn(base, 'border border-border-input text-text-muted')}><Minus className="size-3.5" aria-hidden /></span>;
    default: return <span className={cn(base, 'border border-border-input')} />;
  }
}

export function ProgressStepper({ steps }: { steps: { label: string; state: StepState; message?: string }[] }) {
  return (
    <ol className="flex flex-col gap-0" aria-live="polite">
      {steps.map((s, i) => (
        <li key={s.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <StepIcon state={s.state} />
            {i < steps.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
          </div>
          <div className="pb-4">
            <p className={cn('text-sm font-medium', s.state === 'pending' ? 'text-text-muted' : 'text-text')}>
              {s.label}
              <span className="sr-only">: {stepLabel[s.state]}</span>
            </p>
            {s.message && <p className={cn('text-xs', s.state === 'failed' ? 'text-danger' : 'text-text-muted')}>{s.message}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- ScoreMeter ---------------- */
const bands = [
  { min: 80, label: 'top', bar: 'bg-success', text: 'text-success' },
  { min: 60, label: 'forte', bar: 'bg-primary', text: 'text-text' },
  { min: 40, label: 'médio', bar: 'bg-warning', text: 'text-warning' },
  { min: 0, label: 'abaixo', bar: 'bg-danger', text: 'text-danger' },
];

export function ScoreMeter({ score }: { score: number | null }) {
  if (score === null) {
    return <p className="text-sm text-text-muted">Não avaliado ainda.</p>;
  }
  const band = bands.find((b) => score >= b.min)!;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`${score}, ${band.label}`}
        aria-label="Nota do anúncio"
        className="flex items-baseline gap-2"
      >
        <span className="font-display text-2xl font-extrabold text-text">{score}</span>
        <span className={cn('text-sm font-semibold', band.text)}>{band.label}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div className={cn('h-full rounded-full', band.bar)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-text-muted">Nota de engajamento estimado. Não é previsão de vendas.</p>
    </div>
  );
}

/* ---------------- Skeleton / EmptyState ---------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none', className)} aria-hidden />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-input px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-text-muted" aria-hidden>{icon}</span>
      <div>
        <p className="text-lg font-semibold text-text">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-text-muted">{body}</p>
      </div>
      {action}
    </div>
  );
}
