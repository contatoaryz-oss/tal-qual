'use server';

import { createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseAdmin, supabaseServer } from '@/lib/auth/supabase';
import { requireUser } from '@/lib/auth/session';
import { withServiceTx } from '@/lib/db/sql';
import { allow, clientIp } from '@/lib/rate-limit';
import { removeWorkspaceFiles } from '@/lib/storage';
import { safeNext, siteUrl } from '@/lib/auth/urls';
import type { FormState } from './actions';

const email = z.string().trim().toLowerCase().email('Digite um e-mail válido.');
const password = z.string().min(8, 'Use pelo menos 8 caracteres.').max(72, 'Use até 72 caracteres.');
const k = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 24); // e-mail não fica salvo em claro
const TOO_MANY = 'Muitas tentativas. Espere alguns minutos e tente de novo.';

/** Traduz os códigos do Supabase Auth. Mensagem genérica para o que não deve vazar. */
function authError(code: string | undefined, fallback = 'Não deu certo. Tente de novo.') {
  switch (code) {
    case 'invalid_credentials': return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed': return 'Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.';
    case 'weak_password': return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.';
    case 'over_email_send_rate_limit': case 'over_request_rate_limit': return TOO_MANY;
    case 'same_password': return 'A nova senha precisa ser diferente da atual.';
    default: return fallback;
  }
}

/** Lista opcional de quem pode criar conta: SIGNUP_ALLOWLIST="voce@x.com, @suaagencia.com.br". Vazio = qualquer um. */
function signupAllowed(addr: string) {
  const list = (process.env.SIGNUP_ALLOWLIST ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length) return true;
  return list.some((item) => (item.startsWith('@') ? addr.endsWith(item) : addr === item));
}

const vals = (fd: FormData) => ({ email: String(fd.get('email') ?? ''), next: String(fd.get('next') ?? '') });

/* ------------------------------ entrar com senha ------------------------------ */

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const v = vals(fd);
  const e = email.safeParse(v.email);
  const pw = String(fd.get('password') ?? '');
  if (!e.success) return { values: v, fieldErrors: { email: e.error.issues[0].message } };
  if (!pw) return { values: v, fieldErrors: { password: 'Digite sua senha.' } };
  const ip = await clientIp();
  if (!(await allow([`signin:ip:${ip}`, 20, 600], [`signin:email:${k(e.data)}`, 8, 600]))) return { values: v, error: TOO_MANY };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email: e.data, password: pw });
  if (error) return { values: v, error: authError(error.code) };
  redirect(safeNext(v.next));
}

/* ------------------------------ link mágico ------------------------------ */

export async function magicLinkAction(_: FormState, fd: FormData): Promise<FormState> {
  const v = vals(fd);
  const e = email.safeParse(v.email);
  if (!e.success) return { values: v, fieldErrors: { email: e.error.issues[0].message } };
  const ip = await clientIp();
  if (!(await allow([`mail:ip:${ip}`, 10, 3600], [`mail:email:${k(e.data)}`, 3, 3600]))) return { values: v, error: TOO_MANY };

  const supabase = await supabaseServer();
  await supabase.auth.signInWithOtp({
    email: e.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(v.next))}` },
  });
  // Mesma resposta exista ou não a conta (não revela quem está cadastrado).
  return { ok: true, values: v };
}

/* ------------------------------ criar conta ------------------------------ */

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const v = vals(fd);
  const e = email.safeParse(v.email);
  const p = password.safeParse(String(fd.get('password') ?? ''));
  const errs: Record<string, string> = {};
  if (!e.success) errs.email = e.error.issues[0].message;
  if (!p.success) errs.password = p.error.issues[0].message;
  if (String(fd.get('password')) !== String(fd.get('confirm'))) errs.confirm = 'As senhas não batem.';
  if (Object.keys(errs).length) return { values: v, fieldErrors: errs };
  const ip = await clientIp();
  if (!(await allow([`signup:ip:${ip}`, 5, 3600], [`mail:email:${k(e.data!)}`, 3, 3600]))) return { values: v, error: TOO_MANY };
  if (!signupAllowed(e.data!)) return { values: v, error: 'Cadastro fechado para este e-mail. Fale com quem administra a ferramenta.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email: e.data!, password: p.data!,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/` },
  });
  if (error) return { values: v, error: authError(error.code) };
  return { ok: true, values: v };
}

/* ------------------------------ esqueci / redefinir senha ------------------------------ */

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const v = vals(fd);
  const e = email.safeParse(v.email);
  if (!e.success) return { values: v, fieldErrors: { email: e.error.issues[0].message } };
  const ip = await clientIp();
  if (!(await allow([`mail:ip:${ip}`, 10, 3600], [`mail:email:${k(e.data)}`, 3, 3600]))) return { values: v, error: TOO_MANY };
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(e.data, { redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha` });
  return { ok: true, values: v };
}

export async function updatePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const p = password.safeParse(String(fd.get('password') ?? ''));
  if (!p.success) return { fieldErrors: { password: p.error.issues[0].message } };
  if (String(fd.get('password')) !== String(fd.get('confirm'))) return { fieldErrors: { confirm: 'As senhas não batem.' } };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: p.data });
  if (error) return { error: authError(error.code) };
  return { ok: true };
}

/* ------------------------------ sair ------------------------------ */

export async function signOutAction(scope: 'local' | 'global' = 'local') {
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope });
  redirect(scope === 'global' ? '/entrar?saiu=todos' : '/entrar?saiu=1');
}

/* ------------------------------ apagar conta ------------------------------ */

/**
 * Apaga de verdade: se você é o único dono da agência, apaga a agência (clientes, criativos, arquivos)
 * e depois o usuário no Auth. Se houver outros membros e você for o único dono, pede para transferir antes.
 */
export async function deleteAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(fd.get('confirm') ?? '').trim().toLowerCase() !== user.email.toLowerCase()) {
    return { fieldErrors: { confirm: 'Digite o seu e-mail exatamente como aparece acima.' } };
  }
  const result = await withServiceTx(async (tx) => {
    const memberships = await tx`select org_id, role from org_members where user_id = ${user.id}`;
    const wsToWipe: string[] = [];
    for (const m of memberships) {
      if (m.role !== 'owner') continue;
      const [{ owners, members }] = await tx`
        select count(*) filter (where role = 'owner')::int as owners, count(*)::int as members from org_members where org_id = ${m.orgId}`;
      if (owners > 1) continue; // outro dono assume
      if (members > 1) return { blocked: true as const, wsToWipe };
      const ws = await tx`select id from workspaces where org_id = ${m.orgId}`;
      wsToWipe.push(...ws.map((w) => w.id as string));
      await tx`delete from orgs where id = ${m.orgId}`; // cascata: workspaces, criativos, personas, ofertas…
    }
    return { blocked: false as const, wsToWipe };
  });
  if (result.blocked) return { error: 'Você é o único dono de uma agência com outros membros. Passe a posse para alguém antes de apagar a conta.' };

  for (const id of result.wsToWipe) await removeWorkspaceFiles(id).catch((e) => console.error('[storage] apagar arquivos', e));
  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[auth] apagar usuário', error.message);
    return { error: 'Os dados foram apagados, mas não conseguimos remover o login. Tente de novo em instantes.' };
  }
  const supabase = await supabaseServer();
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  redirect('/entrar?conta=apagada');
}
