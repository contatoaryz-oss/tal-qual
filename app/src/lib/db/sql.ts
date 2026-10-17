import 'server-only';
import postgres from 'postgres';

// Uma conexão por processo. No Supabase, DATABASE_URL = pooler em modo transação (porta 6543):
// por isso prepare:false e tudo que depende do usuário roda dentro de uma transação.

const toIso = (x: string) => new Date(x).toISOString();

const globalForSql = globalThis as unknown as { __sql?: postgres.Sql };

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Veja .env.example.');
  return postgres(url, {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idle_timeout: 20,
    transform: postgres.camel,
    onnotice: () => {},
    // timestamptz/timestamp chegam como string ISO (os tipos do app usam ISODate = string)
    types: { isoDate: { to: 1184, from: [1082, 1114, 1184], serialize: (x: string) => x, parse: toIso } },
  });
}

export const sql = globalForSql.__sql ?? create();
if (process.env.NODE_ENV !== 'production') globalForSql.__sql = sql;

export type Tx = postgres.TransactionSql;

/**
 * Roda como o usuário: dentro da transação, troca para o papel `authenticated` e põe o id em
 * request.jwt.claims — o mesmo que o Supabase faz. A partir daí quem decide o acesso é o RLS do banco.
 */
export async function withUserTx<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    await tx`set local role authenticated`;
    return fn(tx);
  }) as Promise<T>;
}

/** Roda como o dono das tabelas (ignora RLS). Só para jobs e rotinas do servidor que já checaram o workspace. */
export async function withServiceTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return sql.begin(fn) as Promise<T>;
}
