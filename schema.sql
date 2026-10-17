-- replica/schema.sql — migração 0001
-- Clone interno: análise do negócio → conteúdo e anúncios (multi-cliente)
-- Postgres 15+ no Supabase. Acesso: Row Level Security (RLS) em todas as tabelas.
-- Convenções: uuid pk, timestamptz em UTC, dinheiro em centavos + moeda, status com check.

create extension if not exists pgcrypto;
create extension if not exists vector;        -- busca semântica na base de conhecimento (opcional)

-- ------------------------------------------------------------------
-- utilitários
-- ------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ------------------------------------------------------------------
-- 1. tenancy: agência (org) → clientes (workspaces)
-- ------------------------------------------------------------------
create table orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_cost_cap_cents integer not null default 50000 check (monthly_cost_cap_cents >= 0), -- teto de gasto com APIs
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on org_members (user_id);

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  slug text not null,
  website_url text,
  instagram_handle text,
  business_type text check (business_type in ('service','ecommerce','local','agency','software','creator','generic')),
  niche text,
  country text not null default 'BR',
  language text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'onboarding' check (status in ('onboarding','ready','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, slug),
  constraint has_source check (website_url is not null or instagram_handle is not null)
);
create index on workspaces (org_id, status);

-- cliente convidado para aprovar (S22, "could")
create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'approver' check (role in ('editor','approver','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index on workspace_members (user_id);

-- funções de acesso usadas pelas policies
create or replace function is_org_member(o uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members m where m.org_id = o and m.user_id = auth.uid())
$$;

create or replace function can_read_workspace(w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspaces ws join org_members m on m.org_id = ws.org_id
                 where ws.id = w and m.user_id = auth.uid())
      or exists (select 1 from workspace_members wm where wm.workspace_id = w and wm.user_id = auth.uid())
$$;

create or replace function can_write_workspace(w uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from workspaces ws join org_members m on m.org_id = ws.org_id
                 where ws.id = w and m.user_id = auth.uid())
      or exists (select 1 from workspace_members wm where wm.workspace_id = w
                 and wm.user_id = auth.uid() and wm.role = 'editor')
$$;

-- ------------------------------------------------------------------
-- 2. onboarding e marca (F01)
-- ------------------------------------------------------------------
create table onboarding_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  stage text not null check (stage in ('scrape','brand_kit','niche','offers','icps','knowledge','archetype')),
  status text not null default 'pending' check (status in ('pending','running','done','failed','skipped')),
  message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, stage)
);

create table brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references workspaces(id) on delete cascade,
  company_name text,
  headline text,
  logo_path text,                          -- storage: brand/{workspace_id}/logo.png (o arquivo REAL)
  colors jsonb not null default '[]',      -- [{hex, role: primary|secondary|accent|bg|text}]
  fonts jsonb not null default '[]',       -- [{family, role: heading|body, source}]
  tone_of_voice text,
  target_audience text,
  proof_points jsonb not null default '[]',-- depoimentos, números, selos lidos do site
  edited_fields text[] not null default '{}', -- campos que o humano corrigiu: re-scrape não sobrescreve
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table brand_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('photo','person','logo_variant')),
  category text check (category in ('team','product','lifestyle','screenshot','abstract','space')),
  storage_path text not null,
  source_url text,
  person_name text,
  person_role text,
  width integer, height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on brand_assets (workspace_id, kind, category);

-- ------------------------------------------------------------------
-- 3. base de conhecimento (S04)
-- ------------------------------------------------------------------
create table knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('summary','upload','site_page')),
  title text not null,
  storage_path text,
  source_url text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  body text,                                -- para 'summary': o resumo do negócio
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on knowledge_docs (workspace_id, kind);
create unique index one_summary_per_workspace on knowledge_docs (workspace_id) where kind = 'summary';

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references knowledge_docs(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  position integer not null,
  content text not null,
  tsv tsvector generated always as (to_tsvector('portuguese', content)) stored,
  embedding vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doc_id, position)
);
create index on knowledge_chunks (workspace_id);
create index on knowledge_chunks using gin (tsv);

-- ------------------------------------------------------------------
-- 4. público e oferta (F02)
-- ------------------------------------------------------------------
create table icps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  title text,
  description text,
  demographics jsonb not null default '{}', -- {age, gender, income, location, education}
  pain_points text[] not null default '{}',
  goals text[] not null default '{}',
  objections text[] not null default '{}',
  channels text[] not null default '{}',
  customer_words text[] not null default '{}', -- falas literais do cliente/público
  origin text not null default 'generated' check (origin in ('generated','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on icps (workspace_id);

create table offers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  kind text not null default 'service' check (kind in ('service','product','promotion','lead_magnet','package')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text not null default 'BRL',
  emoji text,
  image_path text,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  origin text not null default 'generated' check (origin in ('generated','manual','scraped')),
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on offers (workspace_id, status);

create table offer_icps (
  offer_id uuid not null references offers(id) on delete cascade,
  icp_id uuid not null references icps(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (offer_id, icp_id)
);
create index on offer_icps (icp_id);
create unique index one_primary_icp_per_offer on offer_icps (offer_id) where is_primary;

create table objectives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  goal text not null,                         -- "mais orçamentos de piso instalado acima de 30 m²"
  metric text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on objectives (workspace_id) where active;

-- ------------------------------------------------------------------
-- 5. pesquisa: concorrentes, anúncios, tendências (F03, F04)
-- ------------------------------------------------------------------
create table research_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('competitors','ad_discover','ad_scrape','trends')),
  params jsonb not null default '{}',         -- {query, country, pageId, platforms, days, mode}
  status text not null default 'queued' check (status in ('estimating','awaiting_confirm','queued','running','done','failed','cancelled')),
  estimated_cost_cents integer,
  actual_cost_cents integer,
  provider text,                              -- 'apify', 'web'
  provider_run_id text,
  error text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on research_runs (workspace_id, kind, created_at desc);
create unique index on research_runs (provider, provider_run_id) where provider_run_id is not null; -- webhook idempotente

create table competitors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid references research_runs(id) on delete set null,
  name text not null,
  domain text,
  instagram_handle text,
  meta_page_id text,
  reason text,
  confidence smallint check (confidence between 0 and 100),
  dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on competitors (workspace_id) where not dismissed;
create unique index on competitors (workspace_id, lower(coalesce(domain, name)));

create table competitor_ads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid references research_runs(id) on delete set null,
  competitor_id uuid references competitors(id) on delete set null,
  ad_archive_id text not null,
  page_id text,
  page_name text,
  title text,
  body text,
  cta text,
  link_url text,
  media_path text,                            -- cópia para referência interna; nunca vai para criativo final
  started_at timestamptz,
  is_active boolean,
  analysis jsonb not null default '{}',       -- ângulo, gancho, sensações do Sexy Canvas, formato
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, ad_archive_id)
);
create index on competitor_ads (workspace_id, page_id);

create table trend_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid not null references research_runs(id) on delete cascade,
  kind text not null check (kind in ('hook','angle','format')),
  text text not null,
  platform text check (platform in ('instagram','tiktok','x','facebook','linkedin')),
  evidence_urls text[] not null default '{}',
  strength smallint check (strength between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on trend_items (workspace_id, kind);

-- ------------------------------------------------------------------
-- 6. diferencial do clone: arquétipo + território emocional (Sexy Canvas)
--    Regra: o arquétipo entra DEPOIS da pesquisa, como filtro de veto.
-- ------------------------------------------------------------------
create table archetype_diagnoses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  primary_archetype text not null,
  secondary_archetype text,
  evidence_quotes text[] not null default '{}',  -- falas literais do cliente
  vocabulary_use text[] not null default '{}',
  vocabulary_avoid text[] not null default '{}',
  do_list text[] not null default '{}',
  never_list text[] not null default '{}',
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_current_archetype on archetype_diagnoses (workspace_id) where is_current;

create table territory_scores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  run_id uuid references research_runs(id) on delete set null,
  sensation text not null check (sensation in (
    'vaidade','ganancia','luxuria','gula','preguica','ira','inveja',
    'diversao','liberdade','pertencimento','curiosidade','recompensa','status','seguranca')),
  market_saturation smallint check (market_saturation between 0 and 100), -- quanto o nicho já pesca aqui
  archetype_verdict text check (archetype_verdict in ('allowed','vetoed','caution')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, run_id, sensation)
);
-- Nota: as 14 sensações acima são um placeholder; ajustar à lista exata do seu método.

-- ------------------------------------------------------------------
-- 7. desempenho próprio (S12)
-- ------------------------------------------------------------------
create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  platform text not null check (platform in ('instagram','facebook','tiktok','linkedin','x','meta_ads')),
  handle text not null,
  source text not null check (source in ('windsor','meta_graph','manual_csv')),
  external_id text,
  connected boolean not null default true,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform, handle)
);

create table post_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  account_id uuid not null references social_accounts(id) on delete cascade,
  external_post_id text not null,
  kind text not null default 'organic' check (kind in ('organic','ad')),
  url text,
  caption text,
  media_type text,
  published_at timestamptz,
  impressions integer, reach integer, likes integer, comments integer,
  shares integer, saves integer, clicks integer, views integer,
  spend_cents integer, conversions integer,
  engagement_rate numeric(6,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, external_post_id)
);
create index on post_metrics (workspace_id, published_at desc);

-- ------------------------------------------------------------------
-- 8. recomendações (S13, F05)
-- ------------------------------------------------------------------
create table proposals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  reason text not null,                       -- o "por quê agora"
  impact text,
  area text not null check (area in ('content','ads','offers','research','brand','other')),
  action jsonb not null default '{}',         -- {route, input} que o botão "fazer" dispara
  status text not null default 'pending' check (status in ('pending','approved','rejected','discussing','executed','dismissed')),
  reject_reason text,
  plan_day smallint check (plan_day between 1 and 3),
  dedupe_key text,                            -- evita a mesma sugestão duas vezes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reject_needs_reason check (status <> 'rejected' or reject_reason is not null)
);
create index on proposals (workspace_id, status);
create unique index on proposals (workspace_id, dedupe_key) where dedupe_key is not null and status in ('pending','discussing');

-- ------------------------------------------------------------------
-- 9. criação, edição e qualidade (F06, F07)
-- ------------------------------------------------------------------
create table creatives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  format text not null check (format in ('image','carousel','photo_ad','ad_copy','caption')),
  placement text not null check (placement in ('instagram_portrait','instagram_story','instagram_square','facebook_feed','linkedin','tiktok_story')),
  aspect_ratio text not null check (aspect_ratio in ('1:1','4:5','9:16','16:9','3:2')),
  style text check (style in ('hero','lifestyle','ugc','hyperrealistic','founder','infographic','typographic')),
  brief text not null,
  offer_id uuid references offers(id) on delete set null,
  icp_id uuid references icps(id) on delete set null,
  headline text,
  body text,
  cta text,
  status text not null default 'queued' check (status in ('draft','queued','processing','succeeded','failed')),
  favorite boolean not null default false,
  batch_id uuid,                              -- variantes geradas juntas
  current_version smallint not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on creatives (workspace_id, created_at desc);
create index on creatives (workspace_id, status);
create index on creatives (offer_id);
create index on creatives (icp_id);
create index on creatives (batch_id);

create table creative_versions (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references creatives(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  version smallint not null check (version >= 1),
  media_paths text[] not null default '{}',   -- 1 para imagem, N para carrossel
  headline text, body text, cta text,
  edit_instruction text,                      -- "tira o telefone"
  generator text,                             -- provedor/modelo usado
  prompt_used text,
  cost_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creative_id, version)               -- duas edições ao mesmo tempo não colidem
);

create table carousel_slides (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references creative_versions(id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  role text not null check (role in ('hook','story','cta')),
  headline text not null,
  subheadline text,
  emotional_goal text,
  visual_description text,
  media_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, position)
);

create table creative_sources (                -- linhagem (S24)
  id uuid primary key default gen_random_uuid(),
  creative_id uuid not null references creatives(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_kind text not null check (source_kind in ('trend_item','competitor_ad','proposal','reference_upload','post_metric','territory')),
  source_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index on creative_sources (creative_id);
create index on creative_sources (workspace_id, source_kind, source_id);

create table quality_checks (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references creative_versions(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('brand','ad_score','archetype')),
  judged boolean not null default true,
  score smallint check (score between 0 and 100),
  band text check (band in ('top','strong','average','below')),
  logo_confidence smallint check (logo_confidence between 0 and 100),
  strengths text[] not null default '{}',
  fixes text[] not null default '{}',
  edit_instruction text,
  rubric_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (version_id, kind, rubric_version)
);

-- ------------------------------------------------------------------
-- 10. posts e calendário (F08)
-- ------------------------------------------------------------------
create table post_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  creative_id uuid references creatives(id) on delete set null,
  platform text not null check (platform in ('instagram','facebook','tiktok','linkedin','x')),
  caption text not null,
  hashtags text[] not null default '{}',
  pillar text check (pillar in ('launch','proof','behind_the_scenes','offer','education','entertainment')),
  scheduled_for timestamptz,                  -- UTC; exibir no fuso do workspace
  status text not null default 'proposed' check (status in ('proposed','approved','skipped','scheduled','published_manually')),
  deck_id uuid,                               -- deck do Blitz
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on post_drafts (workspace_id, scheduled_for);
create index on post_drafts (workspace_id, status);
create index on post_drafts (deck_id);
create unique index one_post_per_slot on post_drafts (workspace_id, platform, scheduled_for)
  where status in ('approved','scheduled');

-- ------------------------------------------------------------------
-- 11. agente, memória, custos, inspiração
-- ------------------------------------------------------------------
create table agent_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  thread_id uuid not null,
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on agent_messages (workspace_id, thread_id, created_at);

create table workspace_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind text not null check (kind in ('preference','lesson','rule')),
  key text not null,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table api_costs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete set null,
  provider text not null check (provider in ('anthropic','image','apify','windsor','embeddings')),
  operation text not null,
  cost_cents integer not null check (cost_cents >= 0),
  currency text not null default 'USD',
  ref_table text, ref_id uuid,
  idempotency_key text unique,                -- o mesmo job não cobra duas vezes
  created_at timestamptz not null default now()
);
create index on api_costs (org_id, created_at);
create index on api_costs (workspace_id, created_at);

create table inspiration_presets (            -- presets PRÓPRIOS (não os do original)
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  style text,
  layout_notes text,
  preview_path text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on inspiration_presets (org_id);

create table hooks (                          -- sua biblioteca de ganchos
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  text text not null,
  archetype text check (archetype in ('problem_callout','pov','direct_address','question','shock_stat','before_after','demo_reveal','testimonial')),
  sensation text,
  niches text[] not null default '{}',
  proven_by uuid references post_metrics(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on hooks (org_id);

-- ------------------------------------------------------------------
-- triggers updated_at
-- ------------------------------------------------------------------
do $$
declare t text;
begin
  for t in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format('create trigger trg_%1$s_updated before update on %1$I
                    for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- ------------------------------------------------------------------
-- RLS
-- Tabelas de org: is_org_member. Tabelas de workspace: can_read / can_write.
-- Jobs em background usam a service role (ignora RLS) e checam workspace_id no código.
-- ------------------------------------------------------------------
alter table orgs enable row level security;
create policy orgs_rw on orgs for all using (is_org_member(id)) with check (is_org_member(id));

alter table org_members enable row level security;
create policy org_members_read on org_members for select using (is_org_member(org_id));

alter table workspaces enable row level security;
create policy ws_read on workspaces for select using (can_read_workspace(id));
create policy ws_write on workspaces for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table workspace_members enable row level security;
create policy wsm_read on workspace_members for select using (can_read_workspace(workspace_id));

alter table api_costs enable row level security;
create policy costs_read on api_costs for select using (is_org_member(org_id));

alter table inspiration_presets enable row level security;
create policy presets_rw on inspiration_presets for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table hooks enable row level security;
create policy hooks_rw on hooks for all using (is_org_member(org_id)) with check (is_org_member(org_id));

do $$
declare t text;
begin
  foreach t in array array[
    'onboarding_stages','brand_kits','brand_assets','knowledge_docs','knowledge_chunks',
    'icps','offers','offer_icps','objectives','research_runs','competitors','competitor_ads',
    'trend_items','archetype_diagnoses','territory_scores','social_accounts','post_metrics',
    'proposals','creatives','creative_versions','creative_sources','quality_checks',
    'post_drafts','agent_messages','workspace_memories']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %1$s_read on %1$I for select using (can_read_workspace(workspace_id))', t);
    execute format('create policy %1$s_write on %1$I for all using (can_write_workspace(workspace_id)) with check (can_write_workspace(workspace_id))', t);
  end loop;
end $$;

-- carousel_slides não tem workspace_id: herda pela versão
alter table carousel_slides enable row level security;
create policy slides_read on carousel_slides for select using (
  exists (select 1 from creative_versions v where v.id = version_id and can_read_workspace(v.workspace_id)));
create policy slides_write on carousel_slides for all using (
  exists (select 1 from creative_versions v where v.id = version_id and can_write_workspace(v.workspace_id)))
  with check (
  exists (select 1 from creative_versions v where v.id = version_id and can_write_workspace(v.workspace_id)));

-- Aprovador (cliente) só pode mudar status de post_drafts: aplicar na server action
-- (approveDraft) em vez de abrir 'write' para approver. RLS acima já bloqueia approver de escrever.
