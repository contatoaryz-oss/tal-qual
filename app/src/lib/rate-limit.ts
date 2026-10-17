import 'server-only';
import { headers } from 'next/headers';
import { withServiceTx } from './db/sql';

// Limite de tentativas por janela fixa, guardado no banco (vale para várias instâncias do app).
// O Supabase Auth também tem limites próprios; este protege antes de chegar nele.

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconhecido';
}

/** true = pode seguir. Conta a tentativa. */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const count = await withServiceTx(async (tx) => {
    const [r] = await tx`
      insert into rate_limits (key, window_start, count)
      values (${key}, to_timestamp(floor(extract(epoch from now()) / ${windowSeconds}) * ${windowSeconds}), 1)
      on conflict (key, window_start) do update set count = rate_limits.count + 1
      returning count`;
    if (Math.random() < 0.02) await tx`delete from rate_limits where window_start < now() - interval '1 day'`;
    return r.count as number;
  });
  return count <= limit;
}

/** Vários limites de uma vez (ex.: por IP e por e-mail). Para no primeiro estourado. */
export async function allow(...rules: [key: string, limit: number, windowSeconds: number][]) {
  for (const [k, l, w] of rules) if (!(await hit(k, l, w))) return false;
  return true;
}
