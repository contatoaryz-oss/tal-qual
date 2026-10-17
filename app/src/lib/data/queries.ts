import 'server-only';
import type { Tx } from '../db/sql';
import {
  STAGES, type ApiCost, type BrandField, type BrandKit, type Creative, type CreativeVersion, type Icp, type Offer,
  type OfferIcp, type OnboardingStage, type StageKey, type StageStatus, type Workspace,
} from './types';

// Consultas puras: recebem a transação. Quem chama decide o contexto (usuário com RLS, ou serviço).
// Nenhuma consulta confia no workspace que vem de fora: sempre filtra por workspace_id.

export class NotFoundError extends Error {}

const one = <T>(rows: T[], what: string): T => {
  if (!rows[0]) throw new NotFoundError(what);
  return rows[0];
};

const WS_COLS = 'id, org_id, name, slug, website_url, instagram_handle, business_type, niche, country, language, timezone, status, created_at, updated_at';

/* ------------------------------ org ------------------------------ */

export async function orgOfUser(tx: Tx, userId: string): Promise<{ orgId: string; role: 'owner' | 'admin' | 'member' } | null> {
  const r = await tx`select org_id, role from org_members where user_id = ${userId} order by created_at limit 1`;
  return r[0] ? { orgId: r[0].orgId, role: r[0].role } : null;
}

/* ------------------------------ workspaces ------------------------------ */

export async function listWorkspaces(tx: Tx, orgId: string): Promise<Workspace[]> {
  return tx.unsafe(`select ${WS_COLS} from workspaces where org_id = $1 and status <> 'archived' order by updated_at desc`, [orgId]) as unknown as Workspace[];
}

export async function getWorkspaceBySlug(tx: Tx, orgId: string, slug: string): Promise<Workspace> {
  return one(await tx.unsafe(`select ${WS_COLS} from workspaces where org_id = $1 and slug = $2`, [orgId, slug]) as unknown as Workspace[], `workspace ${slug}`);
}

export async function getWorkspaceById(tx: Tx, id: string): Promise<Workspace | undefined> {
  return (await tx.unsafe(`select ${WS_COLS} from workspaces where id = $1`, [id]) as unknown as Workspace[])[0];
}

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'cliente';

export async function createWorkspace(tx: Tx, orgId: string, userId: string, input: { name: string; websiteUrl: string | null; instagramHandle: string | null }): Promise<Workspace> {
  const base = slugify(input.name);
  const taken = new Set((await tx`select slug from workspaces where org_id = ${orgId} and (slug = ${base} or slug like ${base + '-%'})`).map((r) => r.slug as string));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  const [ws] = await tx.unsafe(
    `insert into workspaces (org_id, name, slug, website_url, instagram_handle, created_by) values ($1,$2,$3,$4,$5,$6) returning ${WS_COLS}`,
    [orgId, input.name, slug, input.websiteUrl, input.instagramHandle, userId],
  ) as unknown as Workspace[];
  for (const stage of STAGES) await tx`insert into onboarding_stages (workspace_id, stage) values (${ws.id}, ${stage})`;
  await tx`insert into brand_kits (workspace_id, company_name) values (${ws.id}, ${input.name})`;
  return ws;
}

export async function updateWorkspace(tx: Tx, id: string, patch: Partial<Pick<Workspace, 'status' | 'niche' | 'businessType' | 'name'>>) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  if (!keys.length) return;
  const r = await tx`update workspaces set ${tx(patch as Record<string, unknown>, ...keys)} where id = ${id} returning id`;
  one(r, id);
}

/* ------------------------------ onboarding ------------------------------ */

export async function listStages(tx: Tx, workspaceId: string): Promise<OnboardingStage[]> {
  const rows = (await tx`select workspace_id, stage, status, message, started_at, finished_at from onboarding_stages where workspace_id = ${workspaceId}`) as unknown as OnboardingStage[];
  return STAGES.map((k) => rows.find((r) => r.stage === k)!).filter(Boolean);
}

export async function setStage(tx: Tx, workspaceId: string, stage: StageKey, status: StageStatus, message: string | null) {
  await tx`
    update onboarding_stages set status = ${status}, message = ${message},
      started_at = case when ${status} = 'running' then now() else started_at end,
      finished_at = case when ${status} in ('done','failed','skipped') then now() else finished_at end
    where workspace_id = ${workspaceId} and stage = ${stage}`;
}

export async function readiness(tx: Tx, workspaceId: string) {
  const [r] = await tx`
    select
      (select jsonb_array_length(colors) from brand_kits where workspace_id = ${workspaceId}) as colors,
      (select logo_path from brand_kits where workspace_id = ${workspaceId}) as logo,
      (select count(*)::int from offers where workspace_id = ${workspaceId} and status <> 'archived') as offers,
      (select count(*)::int from icps where workspace_id = ${workspaceId}) as icps`;
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!r || !r.colors) blockers.push('A marca ainda não tem cores.');
  if (!r?.logo) warnings.push('Sem logo: a arte sai só com o nome do cliente.');
  if (!r?.offers) blockers.push('Cadastre pelo menos uma oferta.');
  if (!r?.icps) warnings.push('Sem persona: a copy fica genérica.');
  return { ready: blockers.length === 0, blockers, warnings };
}

/* ------------------------------ brand ------------------------------ */

export async function getBrandKit(tx: Tx, workspaceId: string): Promise<BrandKit> {
  return one(await tx`
    select workspace_id, company_name, headline, logo_path, colors, fonts, tone_of_voice, target_audience, proof_points, edited_fields, updated_at
    from brand_kits where workspace_id = ${workspaceId}` as unknown as BrandKit[], `brand ${workspaceId}`);
}

const BRAND_COLUMN: Record<BrandField, string> = {
  companyName: 'company_name', headline: 'headline', toneOfVoice: 'tone_of_voice',
  targetAudience: 'target_audience', colors: 'colors', fonts: 'fonts',
};

/** byHuman marca o campo em edited_fields; a máquina (byHuman=false) não sobrescreve campo editado por gente. */
export async function updateBrandKit<K extends BrandField>(tx: Tx, workspaceId: string, field: K, value: BrandKit[K], byHuman: boolean) {
  const col: string = BRAND_COLUMN[field]; // nome de coluna vindo de lista fixa, nunca do usuário
  const isJson = field === 'colors' || field === 'fonts';
  const mark = byHuman ? ', edited_fields = case when $3 = any(edited_fields) then edited_fields else array_append(edited_fields, $3) end' : '';
  const guard = byHuman ? '' : 'and not ($3 = any(edited_fields))';
  await tx.unsafe(
    `update brand_kits set ${col} = $2${isJson ? '::jsonb' : ''} ${mark} where workspace_id = $1 ${guard}`,
    // jsonb: o driver serializa o objeto sozinho (JSON.stringify aqui gravaria texto dentro do JSON)
    [workspaceId, value as never, field as string],
  );
}

export async function setLogoPath(tx: Tx, workspaceId: string, path: string | null) {
  one(await tx`update brand_kits set logo_path = ${path} where workspace_id = ${workspaceId} returning workspace_id`, workspaceId);
}

/* ------------------------------ ICPs ------------------------------ */

const ICP_COLS = 'id, workspace_id, name, title, description, demographics, pain_points, goals, objections, channels, customer_words, origin, created_at, updated_at';

export async function listIcps(tx: Tx, workspaceId: string): Promise<Icp[]> {
  return tx.unsafe(`select ${ICP_COLS} from icps where workspace_id = $1 order by created_at`, [workspaceId]) as unknown as Icp[];
}

export async function getIcp(tx: Tx, workspaceId: string, id: string): Promise<Icp> {
  return one(await tx.unsafe(`select ${ICP_COLS} from icps where workspace_id = $1 and id = $2`, [workspaceId, id]) as unknown as Icp[], id);
}

export type IcpInput = Pick<Icp, 'name' | 'title' | 'description' | 'painPoints' | 'goals' | 'objections' | 'channels'> & { demographics?: Icp['demographics'] };

export async function createIcp(tx: Tx, workspaceId: string, input: IcpInput, origin: Icp['origin'] = 'manual'): Promise<Icp> {
  const [row] = await tx.unsafe(
    `insert into icps (workspace_id, name, title, description, demographics, pain_points, goals, objections, channels, origin)
     values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10) returning ${ICP_COLS}`,
    [workspaceId, input.name, input.title, input.description, (input.demographics ?? {}) as never, input.painPoints, input.goals, input.objections, input.channels, origin],
  ) as unknown as Icp[];
  return row;
}

export async function updateIcp(tx: Tx, workspaceId: string, id: string, p: IcpInput) {
  one(await tx.unsafe(
    `update icps set name=$3, title=$4, description=$5, demographics=$6::jsonb, pain_points=$7, goals=$8, objections=$9, channels=$10
     where workspace_id = $1 and id = $2 returning id`,
    [workspaceId, id, p.name, p.title, p.description, (p.demographics ?? {}) as never, p.painPoints, p.goals, p.objections, p.channels],
  ), id);
}

export async function deleteIcp(tx: Tx, workspaceId: string, id: string) {
  // offer_icps cai em cascata; creatives.icp_id vira null (on delete set null)
  await tx`delete from icps where workspace_id = ${workspaceId} and id = ${id}`;
}

/* ------------------------------ offers ------------------------------ */

const OFFER_COLS = 'id, workspace_id, title, description, kind, price_cents, currency, status, origin, created_at, updated_at';

export async function listOffers(tx: Tx, workspaceId: string): Promise<Offer[]> {
  return tx.unsafe(`select ${OFFER_COLS} from offers where workspace_id = $1 and status <> 'archived' order by created_at`, [workspaceId]) as unknown as Offer[];
}

export async function getOffer(tx: Tx, workspaceId: string, id: string): Promise<Offer> {
  return one(await tx.unsafe(`select ${OFFER_COLS} from offers where workspace_id = $1 and id = $2`, [workspaceId, id]) as unknown as Offer[], id);
}

export type OfferInput = Pick<Offer, 'title' | 'description' | 'kind' | 'priceCents' | 'status'>;

export async function createOffer(tx: Tx, workspaceId: string, input: OfferInput, origin: Offer['origin'] = 'manual'): Promise<Offer> {
  const [row] = await tx.unsafe(
    `insert into offers (workspace_id, title, description, kind, price_cents, status, origin) values ($1,$2,$3,$4,$5,$6,$7) returning ${OFFER_COLS}`,
    [workspaceId, input.title, input.description, input.kind, input.priceCents, input.status, origin],
  ) as unknown as Offer[];
  return row;
}

export async function updateOffer(tx: Tx, workspaceId: string, id: string, p: OfferInput) {
  one(await tx`
    update offers set title = ${p.title}, description = ${p.description}, kind = ${p.kind}, price_cents = ${p.priceCents}, status = ${p.status}
    where workspace_id = ${workspaceId} and id = ${id} returning id`, id);
}

export async function deleteOffer(tx: Tx, workspaceId: string, id: string) {
  await tx`delete from offers where workspace_id = ${workspaceId} and id = ${id}`;
}

export async function listOfferIcps(tx: Tx, workspaceId: string): Promise<OfferIcp[]> {
  return (await tx`select offer_id, icp_id, workspace_id, is_primary from offer_icps where workspace_id = ${workspaceId}`) as unknown as OfferIcp[];
}

/** O primeiro vinculado vira principal (o índice único parcial garante no máximo um). */
export async function linkOfferIcp(tx: Tx, workspaceId: string, offerId: string, icpId: string) {
  await getOffer(tx, workspaceId, offerId);
  await getIcp(tx, workspaceId, icpId);
  await tx`
    insert into offer_icps (offer_id, icp_id, workspace_id, is_primary)
    values (${offerId}, ${icpId}, ${workspaceId}, not exists (select 1 from offer_icps where offer_id = ${offerId} and is_primary))
    on conflict (offer_id, icp_id) do nothing`;
}

export async function unlinkOfferIcp(tx: Tx, workspaceId: string, offerId: string, icpId: string) {
  const [gone] = await tx`delete from offer_icps where workspace_id = ${workspaceId} and offer_id = ${offerId} and icp_id = ${icpId} returning is_primary`;
  if (gone?.isPrimary) {
    await tx`
      update offer_icps set is_primary = true
      where (offer_id, icp_id) = (select offer_id, icp_id from offer_icps where offer_id = ${offerId} order by created_at limit 1)`;
  }
}

export async function setPrimaryIcp(tx: Tx, workspaceId: string, offerId: string, icpId: string) {
  // desliga primeiro, depois liga: respeita o índice único parcial em cada passo
  await tx`update offer_icps set is_primary = false where workspace_id = ${workspaceId} and offer_id = ${offerId} and is_primary`;
  one(await tx`update offer_icps set is_primary = true where workspace_id = ${workspaceId} and offer_id = ${offerId} and icp_id = ${icpId} returning icp_id`, icpId);
}

/* ------------------------------ creatives ------------------------------ */

const CR_COLS = 'id, workspace_id, format, placement, aspect_ratio, style, brief, offer_id, icp_id, headline, body, cta, status, error, favorite, batch_id, current_version, created_at, updated_at';

export async function listCreatives(tx: Tx, workspaceId: string, f: { batchId?: string; pendingOnly?: boolean } = {}): Promise<Creative[]> {
  return tx.unsafe(
    `select ${CR_COLS} from creatives where workspace_id = $1
       and ($2::uuid is null or batch_id = $2) and (not $3 or status in ('queued','processing'))
     order by created_at desc, id`,
    [workspaceId, f.batchId ?? null, Boolean(f.pendingOnly)],
  ) as unknown as Creative[];
}

export async function getCreative(tx: Tx, workspaceId: string, id: string): Promise<Creative> {
  return one(await tx.unsafe(`select ${CR_COLS} from creatives where workspace_id = $1 and id = $2`, [workspaceId, id]) as unknown as Creative[], id);
}

const CV_COLS = 'id, creative_id, workspace_id, version, media_paths, headline, body, cta, edit_instruction, generator, cost_cents, created_at';

export async function listVersions(tx: Tx, workspaceId: string, creativeId: string): Promise<CreativeVersion[]> {
  return tx.unsafe(`select ${CV_COLS} from creative_versions where workspace_id = $1 and creative_id = $2 order by version desc`, [workspaceId, creativeId]) as unknown as CreativeVersion[];
}

/** Versão atual de cada criativo da lista, numa consulta só. */
export async function currentVersions(tx: Tx, workspaceId: string, creatives: Creative[]): Promise<Map<string, CreativeVersion>> {
  const ids = creatives.filter((c) => c.currentVersion > 0).map((c) => c.id);
  if (!ids.length) return new Map();
  const rows = await tx.unsafe(
    `select ${CV_COLS.split(', ').map((c) => `v.${c}`).join(', ')} from creative_versions v join creatives c on c.id = v.creative_id and c.current_version = v.version
     where v.workspace_id = $1 and v.creative_id = any($2::uuid[])`, [workspaceId, ids],
  ) as unknown as CreativeVersion[];
  return new Map(rows.map((r) => [r.creativeId, r]));
}

export type CreativeInput = Pick<Creative, 'format' | 'placement' | 'aspectRatio' | 'style' | 'brief' | 'offerId' | 'icpId'>;

export async function createCreatives(tx: Tx, workspaceId: string, userId: string | null, input: CreativeInput, count: number) {
  const [{ batchId }] = await tx`select gen_random_uuid() as batch_id`;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const [r] = await tx`
      insert into creatives (workspace_id, format, placement, aspect_ratio, style, brief, offer_id, icp_id, batch_id, created_by, created_at)
      values (${workspaceId}, ${input.format}, ${input.placement}, ${input.aspectRatio}, ${input.style}, ${input.brief}, ${input.offerId}, ${input.icpId}, ${batchId}, ${userId}, now() + ${i} * interval '1 millisecond')
      returning id`;
    ids.push(r.id);
  }
  return { batchId: batchId as string, ids };
}

export async function updateCreative(tx: Tx, workspaceId: string, id: string, patch: Partial<Pick<Creative, 'status' | 'error' | 'favorite'>>) {
  const keys = Object.keys(patch) as (keyof typeof patch)[];
  one(await tx`update creatives set ${tx(patch as Record<string, unknown>, ...keys)} where workspace_id = ${workspaceId} and id = ${id} returning id`, id);
}

/** Numera a versão com o criativo travado (for update) + unique(creative_id, version): duas edições não colidem. */
export async function addVersion(tx: Tx, workspaceId: string, creativeId: string, v: Pick<CreativeVersion, 'mediaPaths' | 'headline' | 'body' | 'cta' | 'editInstruction' | 'generator' | 'costCents'>) {
  one(await tx`select id from creatives where workspace_id = ${workspaceId} and id = ${creativeId} for update`, creativeId);
  const [{ next }] = await tx`select coalesce(max(version), 0) + 1 as next from creative_versions where creative_id = ${creativeId}`;
  await tx`
    insert into creative_versions (creative_id, workspace_id, version, media_paths, headline, body, cta, edit_instruction, generator, cost_cents)
    values (${creativeId}, ${workspaceId}, ${next}, ${v.mediaPaths}, ${v.headline}, ${v.body}, ${v.cta}, ${v.editInstruction}, ${v.generator}, ${v.costCents})`;
  await tx`
    update creatives set current_version = ${next}, headline = ${v.headline}, body = ${v.body}, cta = ${v.cta}, status = 'succeeded', error = null
    where id = ${creativeId}`;
  return next as number;
}

export async function deleteCreative(tx: Tx, workspaceId: string, id: string): Promise<string[]> {
  const files = await tx`select unnest(media_paths) as p from creative_versions where workspace_id = ${workspaceId} and creative_id = ${id}`;
  await tx`delete from creatives where workspace_id = ${workspaceId} and id = ${id}`;
  return files.map((f) => f.p as string);
}

/* ------------------------------ custos ------------------------------ */

export async function recordCost(tx: Tx, e: { workspaceId: string; provider: ApiCost['provider']; operation: string; costCents: number; idempotencyKey: string }) {
  await tx`
    insert into api_costs (org_id, workspace_id, provider, operation, cost_cents, idempotency_key)
    select org_id, id, ${e.provider}, ${e.operation}, ${e.costCents}, ${e.idempotencyKey} from workspaces where id = ${e.workspaceId}
    on conflict (idempotency_key) do nothing`;
}

/** Gasto do mês (início do mês no fuso de São Paulo) contra o teto da org. */
export async function monthCost(tx: Tx, orgId: string) {
  const [r] = await tx`
    select o.monthly_cost_cap_cents as cap,
      coalesce((select sum(cost_cents) from api_costs c where c.org_id = o.id
        and c.created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'), 0)::int as spent
    from orgs o where o.id = ${orgId}`;
  const cap = r?.cap ?? 0;
  const spent = r?.spent ?? 0;
  return { spentCents: spent, capCents: cap, remainingCents: Math.max(0, cap - spent) };
}
