import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Renova a sessão (cookies http-only) em toda requisição e protege o app.
// Páginas públicas: entrar, criar conta, esqueci a senha e o retorno dos links de e-mail.
const PUBLIC = ['/entrar', '/criar-conta', '/esqueci-senha', '/auth/'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  // getUser() valida o token no servidor do Auth (não confia só no cookie).
  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p));

  if (!user && !isPublic) {
    if (path.startsWith('/api/')) return new NextResponse('Não encontrado', { status: 404 });
    // Server action com a sessão já encerrada (saiu em outra aba, expirou): um redirect aqui devolve HTML
    // para o cliente do Next, que quebra a tela inteira. Deixa passar: a própria action chama requireUser(),
    // que responde com um redirect que o Next entende, e o RLS barra qualquer leitura/escrita sem usuário.
    if (req.method === 'POST' && req.headers.has('next-action')) return res;
    const url = req.nextUrl.clone();
    url.pathname = '/entrar';
    url.search = path === '/' ? '' : `?next=${encodeURIComponent(path + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  if (user && (path === '/entrar' || path === '/criar-conta')) {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|woff2?)$).*)'],
};
