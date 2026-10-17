'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import { createWorkspaceAction, type FormState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

export function NewClientForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createWorkspaceAction, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-5" noValidate>
      <TextField
        name="source"
        label="Site ou @ do Instagram"
        placeholder="massabruta.com.br ou @massabruta"
        hint="Funciona com só o Instagram, se o cliente não tiver site."
        fieldSize="lg"
        autoComplete="url"
        autoFocus
        required
        defaultValue={state?.values?.source}
        error={state?.fieldErrors?.source}
      />
      <TextField
        name="name"
        label="Nome do cliente (opcional)"
        placeholder="Se deixar em branco, usamos o nome do site ou do perfil"
        maxLength={80}
        defaultValue={state?.values?.name}
        error={state?.fieldErrors?.name}
      />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" variant="accent" size="lg" loading={pending} icon={<ArrowRight className="size-4" aria-hidden />}>
        {pending ? 'Cadastrando…' : 'Ler o negócio'}
      </Button>
    </form>
  );
}
