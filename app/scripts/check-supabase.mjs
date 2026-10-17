#!/usr/bin/env node
// Confere a ligação com o SEU projeto Supabase (o que não dá para testar localmente).
// Uso: npm run check:supabase           (só lê e relata)
//      npm run check:supabase -- --fix  (também cria o bucket privado de arquivos, se faltar)
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env.mjs';

loadEnv();
const fix = process.argv.includes('--fix');
let fails = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const warn = (m) => console.log(`  aviso ${m}`);
const bad = (m) => { fails++; console.log(`  FALHA ${m}`); };

console.log('\n1. Variáveis');
const need = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'];
for (const v of need) process.env[v] ? ok(v) : bad(`${v} não definida`);
if (fails) { console.log('\nPreencha o .env.local (veja .env.example) e rode de novo.'); process.exit(1); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url.includes('localhost')) warn('NEXT_PUBLIC_SUPABASE_URL aponta para localhost (simulador local), não para o seu projeto');
if (process.env.STORAGE_DRIVER !== 'supabase') warn('STORAGE_DRIVER não é "supabase": arquivos ficam no disco, que some a cada deploy na Vercel');
process.env.SIGNUP_ALLOWLIST ? ok(`cadastro limitado a: ${process.env.SIGNUP_ALLOWLIST}`) : warn('SIGNUP_ALLOWLIST vazio: qualquer pessoa pode criar conta (cada uma fica isolada na própria agência)');

console.log('\n2. Banco');
const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql`select 1`; ok('conexão');
  const applied = (await sql`select version from public.schema_migrations order by version`.catch(() => [])).map((r) => r.version);
  applied.length ? ok(`migrações aplicadas: ${applied.join(', ')}`) : bad('nenhuma migração aplicada — rode npm run db:migrate');
  const noRls = await sql`select tablename from pg_tables where schemaname = 'public' and not rowsecurity`;
  noRls.length ? bad(`tabelas SEM RLS: ${noRls.map((r) => r.tablename).join(', ')}`) : ok('RLS ligado em todas as tabelas do schema public');
  const [{ n }] = await sql`select count(*)::int as n from pg_policies where schemaname = 'public'`;
  n > 40 ? ok(`${n} policies`) : bad(`só ${n} policies (esperado mais de 40)`);
  const [{ anon }] = await sql`select count(*)::int as anon from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'`;
  anon === 0 ? ok('papel anon (chave pública) sem permissão nas tabelas') : bad(`anon tem ${anon} permissões em tabelas do public`);
  const [{ canset }] = await sql`select pg_has_role(current_user, 'authenticated', 'member') as canset`;
  canset ? ok('a conexão do app consegue assumir o papel authenticated (RLS por usuário)') : bad('a conexão não consegue "set role authenticated" — use o usuário postgres do projeto');
} catch (e) {
  bad(`banco: ${e.message}`);
} finally {
  await sql.end();
}

console.log('\n3. Auth');
try {
  const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const s = await r.json();
  ok('servidor de Auth responde');
  s.mailer_autoconfirm ? bad('"Confirm email" está DESLIGADO: qualquer um entra sem confirmar o e-mail') : ok('confirmação de e-mail ligada');
  s.disable_signup ? ok('cadastro público desligado (só convidados entram)') : warn('cadastro público ligado — depois de criar sua conta, considere desligar em Authentication → Sign In / Providers');
  s.external?.google ? ok('login com Google ligado') : warn('login com Google desligado (opcional)');
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  error ? bad(`service role não funciona: ${error.message}`) : ok('service role key válida');
} catch (e) {
  bad(`auth: ${e.message}`);
}

console.log('\n4. Arquivos');
try {
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const bucket = process.env.STORAGE_BUCKET ?? 'files';
  const { data, error } = await admin.storage.getBucket(bucket);
  if (error || !data) {
    if (fix) {
      const { error: e2 } = await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: '10MB', allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] });
      e2 ? bad(`não consegui criar o bucket: ${e2.message}`) : ok(`bucket "${bucket}" criado (privado, até 10 MB, só imagens)`);
    } else bad(`bucket "${bucket}" não existe — rode com --fix para criar`);
  } else {
    data.public ? bad(`bucket "${bucket}" está PÚBLICO — deixe privado no painel`) : ok(`bucket "${bucket}" existe e é privado`);
    const probe = `check/${Date.now()}.txt`;
    const up = await admin.storage.from(bucket).upload(probe, new Blob(['ok'], { type: 'text/plain' }), { contentType: 'text/plain' });
    if (up.error && /mime/i.test(up.error.message)) ok('bucket recusa tipo de arquivo fora da lista (esperado)');
    else if (up.error) bad(`gravar no bucket: ${up.error.message}`);
    else { await admin.storage.from(bucket).remove([probe]); ok('gravar e apagar no bucket'); }
  }
} catch (e) {
  bad(`arquivos: ${e.message}`);
}

console.log(fails ? `\n${fails} problema(s). Corrija e rode de novo.\n` : '\nTudo certo com o seu Supabase.\n');
process.exit(fails ? 1 : 0);
