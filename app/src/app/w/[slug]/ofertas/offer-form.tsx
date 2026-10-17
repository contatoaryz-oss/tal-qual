'use client';

import { useActionState, useTransition } from 'react';
import type { FormState } from '@/app/actions';
import type { Icp, Offer, OfferIcp } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { TextField, Textarea } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/native-select';
import { Badge } from '@/components/ui/display';
import { cn, focusRing } from '@/components/ui/cn';
import { KIND_OPTIONS } from '@/lib/labels';


const centsToField = (c: number | null) => (c === null ? '' : (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));

export function OfferForm({
  offer, icps, action, submitLabel,
}: { offer?: Offer; icps?: Icp[]; action: (s: FormState, fd: FormData) => Promise<FormState>; submitLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const v = (k: string, fallback: string) => state?.values?.[k] ?? fallback;
  const err = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="title" label="Nome da oferta" placeholder="Ex.: Piso vinílico instalado" required maxLength={100} defaultValue={v('title', offer?.title ?? '')} error={err('title')} />
        <NativeSelect name="kind" label="Tipo" options={KIND_OPTIONS} defaultValue={v('kind', offer?.kind ?? 'service')} />
        <TextField name="price" label="Preço (opcional)" placeholder="Ex.: 89,90" inputMode="decimal" hint="Deixe em branco se o preço depende de orçamento." defaultValue={v('price', centsToField(offer?.priceCents ?? null))} error={err('price')} />
        <NativeSelect
          name="status"
          label="Situação"
          options={[{ value: 'active', label: 'Ativa — pode ir para anúncio' }, { value: 'draft', label: 'Rascunho' }]}
          defaultValue={v('status', offer?.status === 'draft' ? 'draft' : 'active')}
        />
      </div>
      <Textarea name="description" label="O que está incluído" placeholder="Ex.: com rodapé e acabamento, a partir de 30 m²" maxLength={500} defaultValue={v('description', offer?.description ?? '')} error={err('description')} hint="Vira o texto de apoio da arte." />

      {icps && icps.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-text">Para quais personas</legend>
          <p className="text-sm text-text-muted">A primeira marcada (na ordem da lista) vira a principal. Dá para trocar depois.</p>
          <div className="flex flex-wrap gap-2">
            {icps.map((i) => (
              <label key={i.id} className={cn('flex cursor-pointer items-center gap-2 rounded-md border border-border-input px-3 py-2 text-sm text-text has-[:checked]:border-primary has-[:checked]:bg-surface-2', 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-bg')}>
                <input type="checkbox" name="icps" value={i.id} className="size-4 accent-[var(--color-primary)]" />
                {i.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>{submitLabel}</Button>
        <p aria-live="polite" className="text-sm text-success">{state?.ok ? 'Oferta salva.' : ''}</p>
        {state?.fieldErrors && <p role="alert" className="text-sm text-danger">Confira os campos marcados.</p>}
      </div>
    </form>
  );
}

/** Painel de vínculo oferta ↔ persona na página da oferta (S08). */
export function IcpLinks({
  icps, links, onToggle, onPrimary,
}: {
  icps: Icp[]; links: OfferIcp[];
  onToggle: (icpId: string, link: boolean) => Promise<void>;
  onPrimary: (icpId: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  if (icps.length === 0) return <p className="text-sm text-text-muted">Crie uma persona primeiro para vincular.</p>;
  return (
    <ul className="flex flex-col gap-2" aria-busy={pending}>
      {icps.map((i) => {
        const link = links.find((l) => l.icpId === i.id);
        return (
          <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={Boolean(link)}
                disabled={pending}
                onChange={(e) => start(() => onToggle(i.id, e.target.checked))}
                className={cn('size-4 accent-[var(--color-primary)]', focusRing)}
              />
              <span className="break-words">{i.name}</span>
            </label>
            {link?.isPrimary ? (
              <Badge tone="accent" size="sm">principal</Badge>
            ) : link ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(() => onPrimary(i.id))}>Tornar principal</Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
