import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const url = () => {
  const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!u) throw new Error('NEXT_PUBLIC_SUPABASE_URL não definida. Veja .env.example.');
  return u;
};

/** Cliente com a sessão do usuário (cookies http-only). Fluxo PKCE. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Em Server Component não dá para gravar cookie; o middleware renova a sessão.
        }
      },
    },
  });
}

/** Cliente admin (service role). Só no servidor: criar e apagar usuário. Nunca vai para o navegador. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não definida. Veja .env.example.');
  return createClient(url(), key, { auth: { persistSession: false, autoRefreshToken: false } });
}
