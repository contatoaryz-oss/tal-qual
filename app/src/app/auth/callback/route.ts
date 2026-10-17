import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/auth/supabase';
import { safeNext } from '@/lib/auth/urls';

// Destino dos links de e-mail (confirmar cadastro, link mágico, redefinir senha). Troca o código PKCE pela sessão.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const next = safeNext(req.nextUrl.searchParams.get('next'));
  const to = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin));
  if (!code) return to('/entrar?erro=link');
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return to('/entrar?erro=link');
  return to(next);
}
