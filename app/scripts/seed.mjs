#!/usr/bin/env node
// Dados de exemplo para desenvolvimento: um usuário de teste e dois negócios FICTÍCIOS.
// Uso: npm run seed            (lê .env.local)
// Recusa rodar com NODE_ENV=production. Não usa dados de clientes reais.
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './env.mjs';

loadEnv();
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Seed não roda em produção.'); process.exit(1);
}
for (const v of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL']) {
  if (!process.env[v]) { console.error(`Falta ${v} no .env.local`); process.exit(1); }
}

const email = process.env.SEED_EMAIL ?? 'demo@exemplo.com.br';
const password = process.env.SEED_PASSWORD ?? randomBytes(9).toString('base64url');
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });

const logo = (bg, fg, a, b) => `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="140" viewBox="0 0 420 140">
  <rect x="0" y="6" width="128" height="128" rx="22" fill="${bg}"/><circle cx="64" cy="70" r="34" fill="${fg}"/>
  <text x="148" y="66" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="40" fill="#1F2328">${a}</text>
  <text x="148" y="112" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="40" fill="${bg}">${b}</text></svg>`;

async function putFile(path, content, type) {
  if (process.env.STORAGE_DRIVER === 'supabase') {
    const { error } = await admin.storage.from(process.env.STORAGE_BUCKET ?? 'files').upload(path, Buffer.from(content), { contentType: type, upsert: true });
    if (error) throw error;
  } else {
    const p = join(process.cwd(), '.data', 'files', path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
}

const BUSINESSES = [
  {
    name: 'Pisos Exemplo', slug: 'pisos-exemplo', ig: 'pisos.exemplo', niche: 'Pisos vinílicos instalados',
    colors: [{ hex: '#1F2328', role: 'primary' }, { hex: '#E8692C', role: 'accent' }, { hex: '#F4F1EC', role: 'bg' }, { hex: '#1F2328', role: 'text' }],
    headline: 'Piso novo em poucos dias, sem quebra-quebra', tone: 'Direto e prático. Fala de prazo e obra limpa.',
    logo: logo('#E8692C', '#1F2328', 'PISOS', 'EXEMPLO'),
    icps: [
      { name: 'Dono de casa reformando', title: 'Reforma de um ou dois cômodos', pains: ['Medo de obra suja e demorada', 'Não sabe o preço final'], goals: ['Piso novo em poucos dias', 'Preço fechado'] },
      { name: 'Clínica trocando o piso', title: 'Não pode parar o atendimento', pains: ['Não pode fechar as portas'], goals: ['Instalação fora do horário'] },
    ],
    offers: [
      { title: 'Piso vinílico instalado', description: 'Com rodapé e acabamento, a partir de 30 m².', kind: 'service', price: null },
      { title: 'Visita técnica grátis', description: 'Medição e orçamento no mesmo dia.', kind: 'lead_magnet', price: null },
    ],
  },
  {
    name: 'Doceria Exemplo', slug: 'doceria-exemplo', ig: 'doceria.exemplo', niche: 'Bolos e doces sob encomenda',
    colors: [{ hex: '#5A2D82', role: 'primary' }, { hex: '#F5C33B', role: 'accent' }, { hex: '#FFF7EE', role: 'bg' }, { hex: '#2A1640', role: 'text' }],
    headline: 'Bolo de festa que chega igual à foto', tone: 'Acolhedor e caseiro.',
    logo: logo('#5A2D82', '#FFD6E8', 'DOCERIA', 'EXEMPLO'),
    icps: [{ name: 'Mãe organizando aniversário', title: 'Festa em casa, 20 a 40 pessoas', pains: ['Medo do bolo chegar diferente'], goals: ['Festa linda sem estresse'] }],
    offers: [{ title: 'Bolo de aniversário personalizado', description: 'Serve 20 pessoas, topo personalizado.', kind: 'product', price: 18990 }],
  },
];

try {
  let userId;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) {
    const [u] = await sql`select id from auth.users where lower(email) = lower(${email})`;
    if (!u) throw error;
    userId = u.id;
    console.log(`Usuário ${email} já existia (senha não alterada).`);
  } else {
    userId = created.user.id;
    console.log(`Usuário criado: ${email}  senha: ${password}`);
  }

  await sql.begin(async (tx) => {
    let [m] = await tx`select org_id from org_members where user_id = ${userId}`;
    if (!m) {
      const [o] = await tx`insert into orgs (name) values ('Agência de exemplo') returning id`;
      await tx`insert into org_members (org_id, user_id, role) values (${o.id}, ${userId}, 'owner')`;
      m = { org_id: o.id };
    }
    for (const b of BUSINESSES) {
      const exists = await tx`select 1 from workspaces where org_id = ${m.org_id} and slug = ${b.slug}`;
      if (exists.length) { console.log(`${b.name}: já existe, pulando`); continue; }
      const [ws] = await tx`insert into workspaces (org_id, name, slug, instagram_handle, niche, status, created_by)
        values (${m.org_id}, ${b.name}, ${b.slug}, ${b.ig}, ${b.niche}, 'ready', ${userId}) returning id`;
      for (const stage of ['scrape', 'brand_kit', 'niche', 'offers', 'icps', 'knowledge', 'archetype']) {
        await tx`insert into onboarding_stages (workspace_id, stage, status, message, finished_at)
          values (${ws.id}, ${stage}, ${stage === 'archetype' ? 'skipped' : 'done'}, ${stage === 'archetype' ? 'Precisa do formulário do cliente' : null}, now())`;
      }
      const logoPath = `brand/${ws.id}/logo.svg`;
      await putFile(logoPath, b.logo, 'image/svg+xml');
      await tx`insert into brand_kits (workspace_id, company_name, headline, logo_path, colors, fonts, tone_of_voice)
        values (${ws.id}, ${b.name}, ${b.headline}, ${logoPath}, ${tx.json(b.colors)}, ${tx.json([{ family: 'Manrope', role: 'heading' }, { family: 'Inter', role: 'body' }])}, ${b.tone})`;
      const icpIds = [];
      for (const i of b.icps) {
        const [r] = await tx`insert into icps (workspace_id, name, title, pain_points, goals, channels, origin)
          values (${ws.id}, ${i.name}, ${i.title}, ${i.pains}, ${i.goals}, ${['Instagram']}, 'manual') returning id`;
        icpIds.push(r.id);
      }
      for (const [n, o] of b.offers.entries()) {
        const [r] = await tx`insert into offers (workspace_id, title, description, kind, price_cents, status, origin)
          values (${ws.id}, ${o.title}, ${o.description}, ${o.kind}, ${o.price}, 'active', 'manual') returning id`;
        await tx`insert into offer_icps (offer_id, icp_id, workspace_id, is_primary) values (${r.id}, ${icpIds[n % icpIds.length]}, ${ws.id}, true)`;
      }
      console.log(`${b.name}: criado`);
    }
  });
  console.log('Pronto. Entre em http://localhost:3000/entrar');
} catch (e) {
  console.error('Seed falhou:', e.message ?? e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
