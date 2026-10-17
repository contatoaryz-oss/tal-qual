import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase';

export interface SessionUser { id: string; email: string }

/** Usuário da requisição, validado no servidor do Auth (getUser, não getSession). Uma chamada por request. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? '' };
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect('/entrar');
  return u;
}
