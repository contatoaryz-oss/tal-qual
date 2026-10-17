import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { requireUser } from '../auth/session';
import { withServiceTx, withUserTx, type Tx } from '../db/sql';
import * as q from './queries';
import type { BrandField, BrandKit, Creative, CreativeVersion, Workspace } from './types';

// Funções que as telas e as actions chamam. Todas rodam como o usuário logado (RLS do banco decide).
// Mesmos nomes da camada falsa do M0; agora assíncronas.

export { NotFoundError } from './queries';
export type { CreativeInput, IcpInput, OfferInput } from './queries';

/** Usuário + org da requisição. No primeiro acesso cria a agência dele (dono). Uma vez por request. */
export const context = cache(async () => {
  const user = await requireUser();
  let org = await withUserTx(user.id, (tx) => q.orgOfUser(tx, user.id));
  if (!org) {
    // org e membro só são criados pelo servidor (sem policy de insert para o usuário)
    org = await withServiceTx(async (tx) => {
      const existing = await q.orgOfUser(tx, user.id);
      if (existing) return existing;
      const [o] = await tx`insert into orgs (name) values (${'Minha agência'}) returning id`;
      await tx`insert into org_members (org_id, user_id, role) values (${o.id}, ${user.id}, 'owner') on conflict do nothing`;
      return { orgId: o.id as string, role: 'owner' as const };
    });
  }
  return { user, orgId: org.orgId, role: org.role };
});

async function asUser<T>(fn: (tx: Tx, c: Awaited<ReturnType<typeof context>>) => Promise<T>): Promise<T> {
  const c = await context();
  return withUserTx(c.user.id, (tx) => fn(tx, c));
}

/* workspaces */
export const currentOrgId = async () => (await context()).orgId;
export const listWorkspaces = () => asUser((tx, c) => q.listWorkspaces(tx, c.orgId));
/** Workspace da agência do usuário; se não existir ou for de outra agência, 404 (não revela que existe). */
export const getWorkspace = cache(async (slug: string) => {
  try {
    return await asUser((tx, c) => q.getWorkspaceBySlug(tx, c.orgId, slug));
  } catch (e) {
    if (e instanceof q.NotFoundError) notFound();
    throw e;
  }
});
export const createWorkspace = (input: { name: string; websiteUrl: string | null; instagramHandle: string | null }) =>
  asUser((tx, c) => q.createWorkspace(tx, c.orgId, c.user.id, input));
export const updateWorkspace = (id: string, patch: Partial<Pick<Workspace, 'status' | 'niche' | 'businessType' | 'name'>>) =>
  asUser((tx) => q.updateWorkspace(tx, id, patch));

/* onboarding */
export const listStages = (workspaceId: string) => asUser((tx) => q.listStages(tx, workspaceId));
export const readiness = (workspaceId: string) => asUser((tx) => q.readiness(tx, workspaceId));

/* marca */
export const getBrandKit = (workspaceId: string) => asUser((tx) => q.getBrandKit(tx, workspaceId));
export const updateBrandKit = <K extends BrandField>(workspaceId: string, field: K, value: BrandKit[K], opts: { byHuman: boolean }) =>
  asUser((tx) => q.updateBrandKit(tx, workspaceId, field, value, opts.byHuman));
export const setLogoPath = (workspaceId: string, path: string | null) => asUser((tx) => q.setLogoPath(tx, workspaceId, path));

/* personas */
export const listIcps = (workspaceId: string) => asUser((tx) => q.listIcps(tx, workspaceId));
export const getIcp = (workspaceId: string, id: string) => asUser((tx) => q.getIcp(tx, workspaceId, id));
export const createIcp = (workspaceId: string, input: q.IcpInput) => asUser((tx) => q.createIcp(tx, workspaceId, input));
export const updateIcp = (workspaceId: string, id: string, input: q.IcpInput) => asUser((tx) => q.updateIcp(tx, workspaceId, id, input));
export const deleteIcp = (workspaceId: string, id: string) => asUser((tx) => q.deleteIcp(tx, workspaceId, id));

/* ofertas */
export const listOffers = (workspaceId: string) => asUser((tx) => q.listOffers(tx, workspaceId));
export const getOffer = (workspaceId: string, id: string) => asUser((tx) => q.getOffer(tx, workspaceId, id));
export const createOffer = (workspaceId: string, input: q.OfferInput) => asUser((tx) => q.createOffer(tx, workspaceId, input));
export const updateOffer = (workspaceId: string, id: string, input: q.OfferInput) => asUser((tx) => q.updateOffer(tx, workspaceId, id, input));
export const deleteOffer = (workspaceId: string, id: string) => asUser((tx) => q.deleteOffer(tx, workspaceId, id));
export const listOfferIcps = (workspaceId: string) => asUser((tx) => q.listOfferIcps(tx, workspaceId));
export const linkOfferIcp = (workspaceId: string, offerId: string, icpId: string) => asUser((tx) => q.linkOfferIcp(tx, workspaceId, offerId, icpId));
export const unlinkOfferIcp = (workspaceId: string, offerId: string, icpId: string) => asUser((tx) => q.unlinkOfferIcp(tx, workspaceId, offerId, icpId));
export const setPrimaryIcp = (workspaceId: string, offerId: string, icpId: string) => asUser((tx) => q.setPrimaryIcp(tx, workspaceId, offerId, icpId));

/* criativos */
export const listCreatives = async (workspaceId: string, f: { favorites?: boolean; status?: Creative['status']; batchId?: string } = {}) => {
  const all = await asUser((tx) => q.listCreatives(tx, workspaceId, { batchId: f.batchId }));
  return all.filter((c) => (!f.favorites || c.favorite) && (!f.status || c.status === f.status));
};
export const getCreative = (workspaceId: string, id: string) => asUser((tx) => q.getCreative(tx, workspaceId, id));
export const listVersions = (workspaceId: string, creativeId: string) => asUser((tx) => q.listVersions(tx, workspaceId, creativeId));
export const currentVersions = (workspaceId: string, creatives: Creative[]): Promise<Map<string, CreativeVersion>> =>
  asUser((tx) => q.currentVersions(tx, workspaceId, creatives));
export const createCreatives = (workspaceId: string, input: q.CreativeInput, count: number) =>
  asUser((tx, c) => q.createCreatives(tx, workspaceId, c.user.id, input, count));
export const updateCreative = (workspaceId: string, id: string, patch: Partial<Pick<Creative, 'status' | 'error' | 'favorite'>>) =>
  asUser((tx) => q.updateCreative(tx, workspaceId, id, patch));
export const deleteCreative = (workspaceId: string, id: string) => asUser((tx) => q.deleteCreative(tx, workspaceId, id));

/* custos */
export const monthCost = () => asUser((tx, c) => q.monthCost(tx, c.orgId));
