'use client';

import { useActionState, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import type { FormState } from '@/app/actions';
import type { Placement } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { CostBadge } from '@/components/ui/display';
import { cn } from '@/components/ui/cn';

export interface CreateFormProps {
  offers: { id: string; title: string }[];
  icps: { id: string; name: string }[];
  primaryByOffer: Record<string, string | undefined>;
  placements: { value: Placement; label: string; ratio: string }[];
  defaults: { offerId?: string; icpId?: string };
  costPerArtCents: number;
  disabled: boolean;
  action: (s: FormState, fd: FormData) => Promise<FormState>;
}

/** Proporção desenhada no botão de placement, para escolher pelo formato e não só pelo nome. */
function RatioIcon({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(':').map(Number);
  const scale = 28 / Math.max(w, h);
  return <span aria-hidden className="block rounded-sm border-2 border-current" style={{ width: w * scale, height: h * scale }} />;
}

export function CreateForm({ offers, icps, primaryByOffer, placements, defaults, costPerArtCents, disabled, action }: CreateFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const [offerId, setOfferId] = useState(state?.values?.offerId ?? defaults.offerId ?? offers[0]?.id ?? '');
  const [icpId, setIcpId] = useState(state?.values?.icpId ?? defaults.icpId ?? primaryByOffer[offerId] ?? '');
  const [placement, setPlacement] = useState<Placement>((state?.values?.placement as Placement) ?? 'instagram_portrait');
  const [count, setCount] = useState(Number(state?.values?.count ?? 2));
  const err = (k: string) => state?.fieldErrors?.[k];
  const icpOptions = useMemo(() => [{ value: '', label: 'Sem persona (copy genérica)' }, ...icps.map((i) => ({ value: i.id, label: i.name }))], [icps]);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <NativeSelect
          name="offerId"
          label="Oferta"
          value={offerId}
          onChange={(e) => {
            setOfferId(e.target.value);
            const p = primaryByOffer[e.target.value];
            if (p) setIcpId(p);
          }}
          options={offers.map((o) => ({ value: o.id, label: o.title }))}
          error={err('offerId')}
          disabled={disabled}
        />
        <NativeSelect
          name="icpId"
          label="Persona"
          value={icpId}
          onChange={(e) => setIcpId(e.target.value)}
          options={icpOptions}
          hint="Ao trocar a oferta, a persona principal dela entra sozinha."
          disabled={disabled}
        />
      </div>

      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-medium text-text">Onde vai ser publicado</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {placements.map((p) => (
            <label
              key={p.value}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-bg',
                placement === p.value ? 'border-2 border-primary bg-surface-2 text-text' : 'border-border-input text-text-muted hover:bg-surface-2',
              )}
            >
              <input type="radio" name="placement" value={p.value} checked={placement === p.value} onChange={() => setPlacement(p.value)} className="sr-only" />
              <span className="flex size-8 shrink-0 items-center justify-center"><RatioIcon ratio={p.ratio} /></span>
              <span className="font-medium">{p.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Textarea
        name="brief"
        label="Recado para esta leva (opcional)"
        placeholder="Ex.: foco em entrega rápida para a semana do Dia das Mães"
        maxLength={500}
        defaultValue={state?.values?.brief}
        error={err('brief')}
        disabled={disabled}
      />

      <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <NativeSelect
            name="count"
            label="Quantas variações"
            value={String(count)}
            onChange={(e) => setCount(Number(e.target.value))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
            className="w-24"
            disabled={disabled}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Custo</span>
            <CostBadge cents={costPerArtCents * count} />
          </div>
        </div>
        <Button type="submit" variant="accent" size="lg" loading={pending} disabled={disabled} icon={<Sparkles className="size-4" aria-hidden />}>
          {pending ? 'Enviando…' : `Gerar ${count} ${count === 1 ? 'arte' : 'artes'}`}
        </Button>
      </div>
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
