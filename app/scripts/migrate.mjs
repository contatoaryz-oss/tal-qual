#!/usr/bin/env node
// Aplica supabase/migrations/*.sql em ordem, cada uma numa transação, uma vez só.
// Uso: DIRECT_URL=postgres://... node scripts/migrate.mjs   (ou DATABASE_URL)
// No Supabase use a conexão direta (porta 5432) ou o pooler em modo sessão — não o modo transação.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { loadEnv } from './env.mjs';

loadEnv();
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) { console.error('Defina DIRECT_URL (ou DATABASE_URL) no .env.local'); process.exit(1); }

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists public.schema_migrations (version text primary key, applied_at timestamptz not null default now())`;
  await sql`alter table public.schema_migrations enable row level security`;
  const done = new Set((await sql`select version from public.schema_migrations`).map((r) => r.version));
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    process.stdout.write(`aplicando ${f}… `);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(join(dir, f), 'utf8'));
      await tx`insert into public.schema_migrations (version) values (${f})`;
    });
    console.log('ok');
    applied++;
  }
  console.log(applied ? `${applied} migração(ões) aplicada(s).` : 'Banco já está em dia.');
} catch (e) {
  console.error('\nFalhou:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
