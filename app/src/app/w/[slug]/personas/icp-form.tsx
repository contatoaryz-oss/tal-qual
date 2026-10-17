'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/actions';
import type { Icp } from '@/lib/data/types';
import { Button } from '@/components/ui/button';
import { TextField, Textarea } from '@/components/ui/field';

const join = (xs: string[] | undefined) => (xs ?? []).join('\n');

export function IcpForm({ icp, action, submitLabel }: { icp?: Icp; action: (s: FormState, fd: FormData) => Promise<FormState>; submitLabel: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const v = (k: string, fallback: string) => state?.values?.[k] ?? fallback;
  const err = (k: string) => state?.fieldErrors?.[k];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField name="name" label="Nome da persona" placeholder="Ex.: Dono de casa reformando" required maxLength={80} defaultValue={v('name', icp?.name ?? '')} error={err('name')} />
        <TextField name="title" label="Quem é, em uma linha" placeholder="Ex.: reforma de um ou dois cômodos" maxLength={120} defaultValue={v('title', icp?.title ?? '')} error={err('title')} />
        <TextField name="age" label="Faixa de idade" placeholder="Ex.: 30–55" maxLength={30} defaultValue={v('age', icp?.demographics.age ?? '')} />
        <TextField name="location" label="Onde está" placeholder="Ex.: Grande Porto Alegre" maxLength={80} defaultValue={v('location', icp?.demographics.location ?? '')} />
      </div>
      <Textarea name="description" label="Descrição" placeholder="O que move essa pessoa e onde o negócio entra na vida dela" maxLength={600} defaultValue={v('description', icp?.description ?? '')} error={err('description')} />
      <div className="grid gap-5 md:grid-cols-2">
        <Textarea name="painPoints" label="Dores" hint="Uma por linha. Viram gancho e ângulo nas artes." rows={4} defaultValue={v('painPoints', join(icp?.painPoints))} error={err('painPoints')} />
        <Textarea name="goals" label="O que ela quer" hint="Uma por linha. Viram headline." rows={4} defaultValue={v('goals', join(icp?.goals))} error={err('goals')} />
        <Textarea name="objections" label="Objeções" hint="Uma por linha. O que faz ela hesitar." rows={3} defaultValue={v('objections', join(icp?.objections))} error={err('objections')} />
        <Textarea name="channels" label="Onde ela está" hint="Uma por linha. Ex.: Instagram, Google." rows={3} defaultValue={v('channels', join(icp?.channels))} error={err('channels')} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>{submitLabel}</Button>
        <p aria-live="polite" className="text-sm text-success">{state?.ok ? 'Persona salva.' : ''}</p>
        {state?.fieldErrors && <p role="alert" className="text-sm text-danger">Confira os campos marcados.</p>}
      </div>
    </form>
  );
}
