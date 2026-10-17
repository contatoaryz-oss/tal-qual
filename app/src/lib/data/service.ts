import 'server-only';
import { withServiceTx } from '../db/sql';
import * as q from './queries';
import type { BrandField, BrandKit, Creative, CreativeVersion, StageKey, StageStatus, Workspace } from './types';

// Acesso de serviço para os jobs (sem usuário na requisição). Ignora RLS, então TODA função aqui
// recebe workspaceId e filtra por ele; o job só recebe ids que a action (com RLS) já validou.

export const getWorkspaceById = (id: string) => withServiceTx((tx) => q.getWorkspaceById(tx, id));
export const updateWorkspace = (id: string, patch: Partial<Pick<Workspace, 'status' | 'niche'>>) => withServiceTx((tx) => q.updateWorkspace(tx, id, patch));
export const setStage = (workspaceId: string, stage: StageKey, status: StageStatus, message: string | null = null) =>
  withServiceTx((tx) => q.setStage(tx, workspaceId, stage, status, message));
export const getBrandKit = (workspaceId: string) => withServiceTx((tx) => q.getBrandKit(tx, workspaceId));
export const updateBrandKitByMachine = <K extends BrandField>(workspaceId: string, field: K, value: BrandKit[K]) =>
  withServiceTx((tx) => q.updateBrandKit(tx, workspaceId, field, value, false));
export const getOffer = (workspaceId: string, id: string) => withServiceTx((tx) => q.getOffer(tx, workspaceId, id));
export const getIcp = (workspaceId: string, id: string) => withServiceTx((tx) => q.getIcp(tx, workspaceId, id));
export const getCreative = (workspaceId: string, id: string) => withServiceTx((tx) => q.getCreative(tx, workspaceId, id));
export const pendingCreatives = (workspaceId: string) => withServiceTx((tx) => q.listCreatives(tx, workspaceId, { pendingOnly: true }));
export const updateCreative = (workspaceId: string, id: string, patch: Partial<Pick<Creative, 'status' | 'error'>>) =>
  withServiceTx((tx) => q.updateCreative(tx, workspaceId, id, patch));
export const addVersion = (workspaceId: string, creativeId: string, v: Pick<CreativeVersion, 'mediaPaths' | 'headline' | 'body' | 'cta' | 'editInstruction' | 'generator' | 'costCents'>) =>
  withServiceTx((tx) => q.addVersion(tx, workspaceId, creativeId, v));
export const recordCost = (e: Parameters<typeof q.recordCost>[1]) => withServiceTx((tx) => q.recordCost(tx, e));
