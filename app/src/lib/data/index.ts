import 'server-only';
import { randomUUID } from 'node:crypto';
import { read, tx } from './store';
import { ORG_ID } from './seed';
import {
  STAGES, type BrandField, type BrandKit, type Creative, type CreativeVersion, type Icp, type Offer,
  type OnboardingStage, type StageKey, type StageStatus, type Workspace,
} from './types';

// Camada de dados. Assinaturas finais: o /replica-backend troca o corpo por Supabase (RLS) e as telas não mudam.
// Toda função recebe o workspaceId explícito, igual aos jobs com service role.

const now = () => new Date().toISOString();

export class NotFoundError extends Error {}

/* ------------------------------ workspaces ------------------------------ */

export function currentOrgId() {
  // shortcut: sem auth ainda; um usuário, uma org. Upgrade: sessão do Supabase Auth no /replica-backend.
  return ORG_ID;
}

export function listWorkspaces(): Workspace[] {
  return read().workspaces
    .filter((w) => w.orgId === currentOrgId() && w.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getWorkspace(slug: string): Workspace {
  const ws = read().workspaces.find((w) => w.slug === slug && w.orgId === currentOrgId());
  if (!ws) throw new NotFoundError(`workspace ${slug}`);
  return ws;
}

export function getWorkspaceById(id: string): Workspace | undefined {
  return read().workspaces.find((w) => w.id === id);
}

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'cliente';

export function createWorkspace(input: { name: string; websiteUrl: string | null; instagramHandle: string | null }): Workspace {
  return tx((db) => {
    const base = slugify(input.name);
    let slug = base;
    for (let i = 2; db.workspaces.some((w) => w.orgId === currentOrgId() && w.slug === slug); i++) slug = `${base}-${i}`;
    const t = now();
    const ws: Workspace = {
      id: randomUUID(), orgId: currentOrgId(), name: input.name, slug,
      websiteUrl: input.websiteUrl, instagramHandle: input.instagramHandle,
      businessType: null, niche: null, country: 'BR', language: 'pt-BR', timezone: 'America/Sao_Paulo',
      status: 'onboarding', createdAt: t, updatedAt: t,
    };
    db.workspaces.push(ws);
    for (const stage of STAGES) {
      db.stages.push({ workspaceId: ws.id, stage, status: 'pending', message: null, startedAt: null, finishedAt: null });
    }
    db.brandKits.push({
      workspaceId: ws.id, companyName: input.name, headline: null, logoPath: null, colors: [], fonts: [],
      toneOfVoice: null, targetAudience: null, proofPoints: [], editedFields: [], updatedAt: t,
    });
    return ws;
  });
}

export function updateWorkspace(id: string, patch: Partial<Pick<Workspace, 'status' | 'niche' | 'businessType' | 'name'>>) {
  tx((db) => {
    const ws = db.workspaces.find((w) => w.id === id);
    if (!ws) throw new NotFoundError(id);
    Object.assign(ws, patch, { updatedAt: now() });
  });
}

/* ------------------------------ onboarding ------------------------------ */

export function listStages(workspaceId: string): OnboardingStage[] {
  const rows = read().stages.filter((s) => s.workspaceId === workspaceId);
  return STAGES.map((k) => rows.find((r) => r.stage === k)!).filter(Boolean);
}

export function setStage(workspaceId: string, stage: StageKey, status: StageStatus, message: string | null = null) {
  tx((db) => {
    const s = db.stages.find((r) => r.workspaceId === workspaceId && r.stage === stage);
    if (!s) return;
    s.status = status;
    s.message = message;
    if (status === 'running') s.startedAt = now();
    if (status === 'done' || status === 'failed' || status === 'skipped') s.finishedAt = now();
  });
}

/** Pronto para gerar = marca montada e pelo menos uma oferta. O resto avisa, não bloqueia. */
export function readiness(workspaceId: string) {
  const db = read();
  const brand = db.brandKits.find((b) => b.workspaceId === workspaceId);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!brand || brand.colors.length === 0) blockers.push('A marca ainda não tem cores.');
  if (!brand?.logoPath) warnings.push('Sem logo: a arte sai só com o nome do cliente.');
  if (!db.offers.some((o) => o.workspaceId === workspaceId && o.status !== 'archived')) blockers.push('Cadastre pelo menos uma oferta.');
  if (!db.icps.some((i) => i.workspaceId === workspaceId)) warnings.push('Sem persona: a copy fica genérica.');
  return { ready: blockers.length === 0, blockers, warnings };
}

/* ------------------------------ brand ------------------------------ */

export function getBrandKit(workspaceId: string): BrandKit {
  const b = read().brandKits.find((k) => k.workspaceId === workspaceId);
  if (!b) throw new NotFoundError(`brand ${workspaceId}`);
  return b;
}

/** Edição humana: grava o campo e marca em editedFields para a releitura do site não sobrescrever. */
export function updateBrandKit<K extends BrandField>(workspaceId: string, field: K, value: BrandKit[K], opts: { byHuman: boolean }) {
  return tx((db) => {
    const b = db.brandKits.find((k) => k.workspaceId === workspaceId);
    if (!b) throw new NotFoundError(workspaceId);
    if (!opts.byHuman && b.editedFields.includes(field)) return b; // máquina respeita correção humana
    (b as BrandKit)[field] = value;
    if (opts.byHuman && !b.editedFields.includes(field)) b.editedFields.push(field);
    b.updatedAt = now();
    return b;
  });
}

export function setLogoPath(workspaceId: string, path: string | null) {
  tx((db) => {
    const b = db.brandKits.find((k) => k.workspaceId === workspaceId);
    if (!b) throw new NotFoundError(workspaceId);
    b.logoPath = path;
    b.updatedAt = now();
  });
}

/* ------------------------------ ICPs ------------------------------ */

export function listIcps(workspaceId: string): Icp[] {
  return read().icps.filter((i) => i.workspaceId === workspaceId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getIcp(workspaceId: string, id: string): Icp {
  const i = read().icps.find((x) => x.id === id && x.workspaceId === workspaceId);
  if (!i) throw new NotFoundError(id);
  return i;
}

export type IcpInput = Pick<Icp, 'name' | 'title' | 'description' | 'painPoints' | 'goals' | 'objections' | 'channels'> & { demographics?: Icp['demographics'] };

export function createIcp(workspaceId: string, input: IcpInput, origin: Icp['origin'] = 'manual'): Icp {
  return tx((db) => {
    const t = now();
    const icp: Icp = {
      id: randomUUID(), workspaceId, customerWords: [], demographics: {}, origin, createdAt: t, updatedAt: t, ...input,
    };
    db.icps.push(icp);
    return icp;
  });
}

export function updateIcp(workspaceId: string, id: string, patch: Partial<IcpInput>) {
  return tx((db) => {
    const i = db.icps.find((x) => x.id === id && x.workspaceId === workspaceId);
    if (!i) throw new NotFoundError(id);
    Object.assign(i, patch, { updatedAt: now() });
    return i;
  });
}

export function deleteIcp(workspaceId: string, id: string) {
  tx((db) => {
    db.icps = db.icps.filter((x) => !(x.id === id && x.workspaceId === workspaceId));
    db.offerIcps = db.offerIcps.filter((l) => l.icpId !== id);
    for (const c of db.creatives) if (c.icpId === id) c.icpId = null; // on delete set null
  });
}

/* ------------------------------ offers ------------------------------ */

export function listOffers(workspaceId: string): Offer[] {
  return read().offers.filter((o) => o.workspaceId === workspaceId && o.status !== 'archived')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getOffer(workspaceId: string, id: string): Offer {
  const o = read().offers.find((x) => x.id === id && x.workspaceId === workspaceId);
  if (!o) throw new NotFoundError(id);
  return o;
}

export type OfferInput = Pick<Offer, 'title' | 'description' | 'kind' | 'priceCents' | 'status'>;

export function createOffer(workspaceId: string, input: OfferInput, origin: Offer['origin'] = 'manual'): Offer {
  return tx((db) => {
    const t = now();
    const o: Offer = { id: randomUUID(), workspaceId, currency: 'BRL', origin, createdAt: t, updatedAt: t, ...input };
    db.offers.push(o);
    return o;
  });
}

export function updateOffer(workspaceId: string, id: string, patch: Partial<OfferInput>) {
  return tx((db) => {
    const o = db.offers.find((x) => x.id === id && x.workspaceId === workspaceId);
    if (!o) throw new NotFoundError(id);
    Object.assign(o, patch, { updatedAt: now() });
    return o;
  });
}

export function deleteOffer(workspaceId: string, id: string) {
  tx((db) => {
    db.offers = db.offers.filter((x) => !(x.id === id && x.workspaceId === workspaceId));
    db.offerIcps = db.offerIcps.filter((l) => l.offerId !== id);
    for (const c of db.creatives) if (c.offerId === id) c.offerId = null;
  });
}

export function listOfferIcps(workspaceId: string) {
  return read().offerIcps.filter((l) => l.workspaceId === workspaceId);
}

/** Igual ao índice único parcial do SQL: no máximo um ICP principal por oferta; o primeiro vinculado vira principal. */
export function linkOfferIcp(workspaceId: string, offerId: string, icpId: string) {
  tx((db) => {
    if (db.offerIcps.some((l) => l.offerId === offerId && l.icpId === icpId)) return;
    const hasPrimary = db.offerIcps.some((l) => l.offerId === offerId && l.isPrimary);
    db.offerIcps.push({ offerId, icpId, workspaceId, isPrimary: !hasPrimary });
  });
}

export function unlinkOfferIcp(workspaceId: string, offerId: string, icpId: string) {
  tx((db) => {
    const wasPrimary = db.offerIcps.find((l) => l.offerId === offerId && l.icpId === icpId)?.isPrimary;
    db.offerIcps = db.offerIcps.filter((l) => !(l.offerId === offerId && l.icpId === icpId && l.workspaceId === workspaceId));
    if (wasPrimary) {
      const next = db.offerIcps.find((l) => l.offerId === offerId);
      if (next) next.isPrimary = true;
    }
  });
}

export function setPrimaryIcp(workspaceId: string, offerId: string, icpId: string) {
  tx((db) => {
    for (const l of db.offerIcps) if (l.offerId === offerId && l.workspaceId === workspaceId) l.isPrimary = l.icpId === icpId;
  });
}

/* ------------------------------ creatives ------------------------------ */

export function listCreatives(workspaceId: string, filter: { status?: Creative['status']; favorites?: boolean; batchId?: string } = {}) {
  return read().creatives
    .filter((c) => c.workspaceId === workspaceId)
    .filter((c) => !filter.status || c.status === filter.status)
    .filter((c) => !filter.favorites || c.favorite)
    .filter((c) => !filter.batchId || c.batchId === filter.batchId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getCreative(workspaceId: string, id: string): Creative {
  const c = read().creatives.find((x) => x.id === id && x.workspaceId === workspaceId);
  if (!c) throw new NotFoundError(id);
  return c;
}

export function listVersions(workspaceId: string, creativeId: string): CreativeVersion[] {
  return read().creativeVersions.filter((v) => v.creativeId === creativeId && v.workspaceId === workspaceId)
    .sort((a, b) => b.version - a.version);
}

export function currentVersion(workspaceId: string, creative: Creative): CreativeVersion | undefined {
  return read().creativeVersions.find((v) => v.creativeId === creative.id && v.workspaceId === workspaceId && v.version === creative.currentVersion);
}

export type CreativeInput = Pick<Creative, 'format' | 'placement' | 'aspectRatio' | 'style' | 'brief' | 'offerId' | 'icpId'>;

export function createCreatives(workspaceId: string, input: CreativeInput, count: number): { batchId: string; ids: string[] } {
  return tx((db) => {
    const batchId = randomUUID();
    const t = now();
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const c: Creative = {
        id: randomUUID(), workspaceId, ...input, headline: null, body: null, cta: null,
        status: 'queued', error: null, favorite: false, batchId, currentVersion: 0, createdAt: t, updatedAt: t,
      };
      db.creatives.push(c);
      ids.push(c.id);
    }
    return { batchId, ids };
  });
}

export function updateCreative(workspaceId: string, id: string, patch: Partial<Pick<Creative, 'status' | 'error' | 'headline' | 'body' | 'cta' | 'favorite'>>) {
  tx((db) => {
    const c = db.creatives.find((x) => x.id === id && x.workspaceId === workspaceId);
    if (!c) throw new NotFoundError(id);
    Object.assign(c, patch, { updatedAt: now() });
  });
}

/** Igual ao `unique (creative_id, version)` + lock: numera a versão dentro da mesma transação. */
export function addVersion(workspaceId: string, creativeId: string, v: Omit<CreativeVersion, 'id' | 'version' | 'createdAt' | 'workspaceId' | 'creativeId'>) {
  return tx((db) => {
    const c = db.creatives.find((x) => x.id === creativeId && x.workspaceId === workspaceId);
    if (!c) throw new NotFoundError(creativeId);
    const version = Math.max(0, ...db.creativeVersions.filter((x) => x.creativeId === creativeId).map((x) => x.version)) + 1;
    const row: CreativeVersion = { id: randomUUID(), creativeId, workspaceId, version, createdAt: now(), ...v };
    db.creativeVersions.push(row);
    c.currentVersion = version;
    c.headline = v.headline;
    c.body = v.body;
    c.cta = v.cta;
    c.status = 'succeeded';
    c.updatedAt = now();
    return row;
  });
}

export function deleteCreative(workspaceId: string, id: string) {
  tx((db) => {
    db.creatives = db.creatives.filter((x) => !(x.id === id && x.workspaceId === workspaceId));
    db.creativeVersions = db.creativeVersions.filter((x) => x.creativeId !== id);
  });
}

/* ------------------------------ custos ------------------------------ */

/** Igual ao `idempotency_key unique`: o mesmo job não registra custo duas vezes. */
export function recordCost(entry: { workspaceId: string; provider: 'anthropic' | 'image'; operation: string; costCents: number; idempotencyKey: string }) {
  tx((db) => {
    if (db.apiCosts.some((c) => c.idempotencyKey === entry.idempotencyKey)) return;
    db.apiCosts.push({ id: randomUUID(), orgId: currentOrgId(), createdAt: now(), ...entry });
  });
}

export function monthCost() {
  const db = read();
  const org = db.orgs.find((o) => o.id === currentOrgId())!;
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(3, 0, 0, 0); // início do mês em São Paulo (UTC-3)
  const spent = db.apiCosts.filter((c) => c.orgId === org.id && c.createdAt >= start.toISOString()).reduce((s, c) => s + c.costCents, 0);
  return { spentCents: spent, capCents: org.monthlyCostCapCents, remainingCents: Math.max(0, org.monthlyCostCapCents - spent) };
}
