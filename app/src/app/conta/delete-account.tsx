'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/actions';
import { deleteAccountAction } from '@/app/auth-actions';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';

export function DeleteAccount({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccountAction, null);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField name="confirm" label={`Para confirmar, digite ${email}`} autoComplete="off" error={state?.fieldErrors?.confirm} />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div><Button type="submit" variant="danger" loading={pending}>Apagar minha conta e os dados</Button></div>
    </form>
  );
}
