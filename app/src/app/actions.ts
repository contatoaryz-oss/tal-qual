'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import * as data from '@/lib/data';
import { saveFile } from '@/lib/data/store';
import { PLACEMENTS, type BrandColor, type Placement } from '@/lib/data/types';
import { startGeneration, startOnboarding } from '@/lib/jobs/run';
import { parsePrice, parseSource } from '@/lib/parse';

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; values?: Record<string, string> } | null;

const values = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
const lines = (s: string | undefined) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12);
const fieldErrors = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

/* ------------------------------ S01: novo cliente ------------------------------ */

export async function createWorkspaceAction(_: FormState, fd: FormData): Promise<FormState> {
  const v = values(fd);
  const source = parseSource(v.source ?? '');
  if (!source) {
    return { values: v, fieldErrors: { source: 'Use um endereço de site (ex.: massabruta.com.br) ou um @ do Instagram.' } };
  }
  const name = (v.name ?? '').trim() || source.suggestedName;
  if (name.length > 80) return { values: v, fieldErrors: { name: 'Use até 80 caracteres.' } };
  const ws = data.createWorkspace({ name, websiteUrl: source.websiteUrl, instagramHandle: source.instagramHandle });
  startOnboarding(ws.id);
  redirect(`/w/${ws.slug}/onboarding`);
}

/* ------------------------------ S03: marca ------------------------------ */

const textField = z.enum(['companyName', 'headline', 'toneOfVoice', 'targetAudience']);

export async function updateBrandTextAction(slug: string, field: string, value: string): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const f = textField.safeParse(field);
  if (!f.success) return { error: 'Campo inválido.' };
  const clean = value.trim();
  if (clean.length > 400) return { error: 'Use até 400 caracteres.' };
  data.updateBrandKit(ws.id, f.data, clean || null, { byHuman: true });
  if (f.data === 'companyName' && clean) data.updateWorkspace(ws.id, { name: clean });
  revalidatePath(`/w/${slug}`, 'layout');
  return { ok: true };
}

export async function updateNicheAction(slug: string, value: string): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const clean = value.trim();
  if (clean.length > 120) return { error: 'Use até 120 caracteres.' };
  data.updateWorkspace(ws.id, { niche: clean || null });
  revalidatePath(`/w/${slug}/marca`);
  return { ok: true };
}

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use o formato #RRGGBB.');
const roles = z.enum(['primary', 'secondary', 'accent', 'bg', 'text']);

export async function updateBrandColorsAction(slug: string, colors: BrandColor[]): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const parsed = z.array(z.object({ hex, role: roles })).max(8).safeParse(colors);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Cor inválida.' };
  data.updateBrandKit(ws.id, 'colors', parsed.data.map((c) => ({ ...c, hex: c.hex.toUpperCase() })), { byHuman: true });
  revalidatePath(`/w/${slug}/marca`);
  return { ok: true };
}

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_LOGO = 10 * 1024 * 1024;

export async function uploadLogoAction(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const file = fd.get('logo');
  if (!(file instanceof File) || file.size === 0) return { fieldErrors: { logo: 'Escolha um arquivo.' } };
  if (!LOGO_TYPES.includes(file.type)) return { fieldErrors: { logo: 'Use PNG, JPG, WebP ou SVG.' } };
  if (file.size > MAX_LOGO) return { fieldErrors: { logo: 'O arquivo passa de 10 MB.' } };
  const buf = Buffer.from(await file.arrayBuffer());
  // SVG vira PNG na entrada: nunca servimos SVG enviado por usuário (pode carregar script).
  let png: Buffer;
  try {
    if (file.type === 'image/svg+xml') {
      const { Resvg } = await import('@resvg/resvg-js');
      png = Buffer.from(new Resvg(buf.toString('utf8'), { fitTo: { mode: 'height', value: 512 } }).render().asPng());
    } else {
      const sharp = (await import('sharp')).default;
      png = await sharp(buf).resize({ height: 512, withoutEnlargement: true }).png().toBuffer();
    }
  } catch {
    return { fieldErrors: { logo: 'Não conseguimos ler esta imagem. Tente outro arquivo.' } };
  }
  const path = saveFile(`brand/${ws.id}/logo-${Date.now()}.png`, png);
  data.setLogoPath(ws.id, path);
  revalidatePath(`/w/${slug}/marca`);
  return { ok: true };
}

export async function removeLogoAction(slug: string) {
  const ws = data.getWorkspace(slug);
  data.setLogoPath(ws.id, null);
  revalidatePath(`/w/${slug}/marca`);
}

/* ------------------------------ S05–S06: personas ------------------------------ */

const icpSchema = z.object({
  name: z.string().trim().min(2, 'Dê um nome à persona.').max(80, 'Use até 80 caracteres.'),
  title: z.string().trim().max(120, 'Use até 120 caracteres.').optional(),
  description: z.string().trim().max(600, 'Use até 600 caracteres.').optional(),
  age: z.string().trim().max(30).optional(),
  location: z.string().trim().max(80).optional(),
});

function icpFromForm(fd: FormData) {
  const v = values(fd);
  const p = icpSchema.safeParse(v);
  if (!p.success) return { error: { values: v, fieldErrors: fieldErrors(p.error) } as FormState };
  return {
    input: {
      name: p.data.name, title: p.data.title || null, description: p.data.description || null,
      demographics: { ...(p.data.age ? { age: p.data.age } : {}), ...(p.data.location ? { location: p.data.location } : {}) },
      painPoints: lines(v.painPoints), goals: lines(v.goals), objections: lines(v.objections), channels: lines(v.channels),
    },
  };
}

export async function createIcpAction(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const r = icpFromForm(fd);
  if ('error' in r) return r.error!;
  const icp = data.createIcp(ws.id, r.input);
  revalidatePath(`/w/${slug}/personas`);
  redirect(`/w/${slug}/personas/${icp.id}?salvo=1`);
}

export async function updateIcpAction(slug: string, id: string, _: FormState, fd: FormData): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const r = icpFromForm(fd);
  if ('error' in r) return r.error!;
  data.updateIcp(ws.id, id, r.input);
  revalidatePath(`/w/${slug}/personas`);
  return { ok: true };
}

export async function deleteIcpAction(slug: string, id: string) {
  const ws = data.getWorkspace(slug);
  data.deleteIcp(ws.id, id);
  revalidatePath(`/w/${slug}/personas`);
  redirect(`/w/${slug}/personas`);
}

/* ------------------------------ S07–S08: ofertas ------------------------------ */

const offerSchema = z.object({
  title: z.string().trim().min(2, 'Dê um nome à oferta.').max(100, 'Use até 100 caracteres.'),
  description: z.string().trim().max(500, 'Use até 500 caracteres.').optional(),
  kind: z.enum(['service', 'product', 'promotion', 'lead_magnet', 'package']),
  status: z.enum(['draft', 'active']).default('active'),
});

function offerFromForm(fd: FormData) {
  const v = values(fd);
  const p = offerSchema.safeParse(v);
  const price = parsePrice(v.price);
  const errs = p.success ? {} : fieldErrors(p.error);
  if (price === 'invalid') errs.price = 'Use só números. Ex.: 89,90';
  if (!p.success || price === 'invalid') return { error: { values: v, fieldErrors: errs } as FormState };
  return { input: { title: p.data.title, description: p.data.description || null, kind: p.data.kind, status: p.data.status, priceCents: price } };
}

export async function createOfferAction(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const r = offerFromForm(fd);
  if ('error' in r) return r.error!;
  const offer = data.createOffer(ws.id, r.input);
  for (const icpId of fd.getAll('icps').map(String)) data.linkOfferIcp(ws.id, offer.id, icpId);
  revalidatePath(`/w/${slug}/ofertas`);
  redirect(`/w/${slug}/ofertas/${offer.id}?salvo=1`);
}

export async function updateOfferAction(slug: string, id: string, _: FormState, fd: FormData): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const r = offerFromForm(fd);
  if ('error' in r) return r.error!;
  data.updateOffer(ws.id, id, r.input);
  revalidatePath(`/w/${slug}/ofertas`);
  return { ok: true };
}

export async function deleteOfferAction(slug: string, id: string) {
  const ws = data.getWorkspace(slug);
  data.deleteOffer(ws.id, id);
  revalidatePath(`/w/${slug}/ofertas`);
  redirect(`/w/${slug}/ofertas`);
}

export async function toggleOfferIcpAction(slug: string, offerId: string, icpId: string, link: boolean) {
  const ws = data.getWorkspace(slug);
  if (link) data.linkOfferIcp(ws.id, offerId, icpId);
  else data.unlinkOfferIcp(ws.id, offerId, icpId);
  revalidatePath(`/w/${slug}/ofertas/${offerId}`);
}

export async function setPrimaryIcpAction(slug: string, offerId: string, icpId: string) {
  const ws = data.getWorkspace(slug);
  data.setPrimaryIcp(ws.id, offerId, icpId);
  revalidatePath(`/w/${slug}/ofertas/${offerId}`);
}

/* ------------------------------ S15–S18: criativos ------------------------------ */

const createSchema = z.object({
  placement: z.enum(Object.keys(PLACEMENTS) as [Placement, ...Placement[]]),
  offerId: z.string().uuid('Escolha a oferta.'),
  icpId: z.string().uuid().optional().or(z.literal('')),
  brief: z.string().trim().max(500, 'Use até 500 caracteres.').optional(),
  count: z.coerce.number().int().min(1).max(4),
});

export async function createCreativesAction(slug: string, _: FormState, fd: FormData): Promise<FormState> {
  const ws = data.getWorkspace(slug);
  const v = values(fd);
  const p = createSchema.safeParse(v);
  if (!p.success) return { values: v, fieldErrors: fieldErrors(p.error) };
  const ready = data.readiness(ws.id);
  if (!ready.ready) return { values: v, error: ready.blockers.join(' ') };
  const { remainingCents } = data.monthCost();
  if (remainingCents <= 0) return { values: v, error: 'O teto de gasto do mês acabou.' };
  data.getOffer(ws.id, p.data.offerId); // garante que é deste cliente
  if (p.data.icpId) data.getIcp(ws.id, p.data.icpId);
  const { batchId, ids } = data.createCreatives(ws.id, {
    format: 'image', placement: p.data.placement, aspectRatio: PLACEMENTS[p.data.placement].ratio, style: 'typographic',
    brief: p.data.brief ?? '', offerId: p.data.offerId, icpId: p.data.icpId || null,
  }, p.data.count);
  startGeneration(ws.id, ids);
  redirect(`/w/${slug}/criar/lote/${batchId}`);
}

export async function retryCreativeAction(slug: string, id: string) {
  const ws = data.getWorkspace(slug);
  data.updateCreative(ws.id, id, { status: 'queued', error: null });
  startGeneration(ws.id, [id]);
  revalidatePath(`/w/${slug}/galeria`);
}

export async function toggleFavoriteAction(slug: string, id: string, favorite: boolean) {
  const ws = data.getWorkspace(slug);
  data.updateCreative(ws.id, id, { favorite });
  revalidatePath(`/w/${slug}/galeria`);
}

export async function deleteCreativeAction(slug: string, id: string) {
  const ws = data.getWorkspace(slug);
  data.deleteCreative(ws.id, id);
  revalidatePath(`/w/${slug}/galeria`);
  redirect(`/w/${slug}/galeria`);
}
