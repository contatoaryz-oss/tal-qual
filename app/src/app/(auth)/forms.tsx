'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { MailCheck } from 'lucide-react';
import type { FormState } from '@/app/actions';
import { forgotPasswordAction, magicLinkAction, signInAction, signUpAction, updatePasswordAction } from '@/app/auth-actions';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { InlineAlert } from '@/components/ui/display';

function Sent({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-success-subtle text-success" aria-hidden><MailCheck className="size-6" /></span>
      <h2 className="font-display text-lg font-bold text-text">{title}</h2>
      <p className="text-sm text-text-muted">{children}</p>
    </div>
  );
}

const linkCls = 'rounded-sm font-medium text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function SignInForm({ next }: { next: string }) {
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(signInAction, null);
  const [mlState, mlAction, mlPending] = useActionState<FormState, FormData>(magicLinkAction, null);

  if (mode === 'magic' && mlState?.ok) {
    return (
      <Sent title="Confira seu e-mail">
        Se houver uma conta com {mlState.values?.email}, o link de acesso chega em instantes. Ele vale por uma hora.
      </Sent>
    );
  }
  const state = mode === 'password' ? pwState : mlState;
  return (
    <form action={mode === 'password' ? pwAction : mlAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <TextField name="email" type="email" label="E-mail" autoComplete="email" autoFocus required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      {mode === 'password' && (
        <div className="flex flex-col gap-1.5">
          <TextField name="password" type="password" label="Senha" autoComplete="current-password" required error={pwState?.fieldErrors?.password} />
          <Link href="/esqueci-senha" className={`self-end text-sm ${linkCls}`}>Esqueci a senha</Link>
        </div>
      )}
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" loading={pwPending || mlPending}>{mode === 'password' ? 'Entrar' : 'Enviar link de acesso'}</Button>
      <button type="button" onClick={() => setMode(mode === 'password' ? 'magic' : 'password')} className={`text-sm ${linkCls}`}>
        {mode === 'password' ? 'Prefiro receber um link por e-mail' : 'Prefiro entrar com senha'}
      </button>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, null);
  if (state?.ok) {
    return (
      <Sent title="Falta confirmar o e-mail">
        Mandamos um link para {state.values?.email}. Clique nele para ativar a conta e entrar.
      </Sent>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField name="email" type="email" label="E-mail" autoComplete="email" autoFocus required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      <TextField name="password" type="password" label="Senha" hint="Pelo menos 8 caracteres." autoComplete="new-password" required error={state?.fieldErrors?.password} />
      <TextField name="confirm" type="password" label="Repita a senha" autoComplete="new-password" required error={state?.fieldErrors?.confirm} />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" variant="accent" loading={pending}>Criar conta</Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, null);
  if (state?.ok) {
    return (
      <Sent title="Confira seu e-mail">
        Se houver uma conta com {state.values?.email}, o link para criar uma senha nova chega em instantes.
      </Sent>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField name="email" type="email" label="E-mail da conta" autoComplete="email" autoFocus required defaultValue={state?.values?.email} error={state?.fieldErrors?.email} />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" loading={pending}>Enviar link</Button>
    </form>
  );
}

export function NewPasswordForm({ after }: { after?: React.ReactNode }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePasswordAction, null);
  if (state?.ok) return <InlineAlert tone="success" title="Senha atualizada">{after}</InlineAlert>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <TextField name="password" type="password" label="Nova senha" hint="Pelo menos 8 caracteres." autoComplete="new-password" required error={state?.fieldErrors?.password} />
      <TextField name="confirm" type="password" label="Repita a nova senha" autoComplete="new-password" required error={state?.fieldErrors?.confirm} />
      {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <div><Button type="submit" loading={pending}>Salvar senha</Button></div>
    </form>
  );
}
