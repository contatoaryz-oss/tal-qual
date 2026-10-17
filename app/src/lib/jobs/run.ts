import 'server-only';
import { after } from 'next/server';
import * as data from '../data/service';
import { readFile, saveFile } from '../storage';
import { PLACEMENTS, type StageKey } from '../data/types';
import { composeAd, logoToPng } from '../compose/compose';
import { providers } from './providers';

// shortcut: jobs rodam no mesmo processo do Next (fire-and-forget). Upgrade: Trigger.dev no /replica-backend,
// com retry e idempotency key `{tipo}:{id}:{versão}`. A tela já consulta o estado no banco, então não muda.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const running = new Set<string>();

function once(key: string, fn: () => Promise<void>) {
  if (running.has(key)) return;
  running.add(key);
  const job = fn().catch((err) => console.error(`[job ${key}]`, err)).finally(() => running.delete(key));
  // Em servidor sem estado (Vercel), a função congela quando a resposta sai. after() mantém o job vivo até
  // terminar (waitUntil). Fora de uma requisição (scripts), after() lança: aí o job segue normal no processo.
  try { after(() => job); } catch {}
}

/* ------------------------------ onboarding ------------------------------ */

export function startOnboarding(workspaceId: string) {
  once(`onboard:${workspaceId}`, async () => {
    const ws = await data.getWorkspaceById(workspaceId);
    if (!ws) return;
    const step = async (stage: StageKey, fn: () => Promise<{ status: 'done' | 'skipped' | 'failed'; message?: string }>) => {
      await data.setStage(workspaceId, stage, 'running');
      await sleep(700);
      try {
        const r = await fn();
        await data.setStage(workspaceId, stage, r.status, r.message ?? null);
      } catch (e) {
        await data.setStage(workspaceId, stage, 'failed', e instanceof Error ? e.message : 'Erro inesperado');
      }
    };

    let reading: Awaited<ReturnType<typeof providers.site.read>> | null = null;
    await step('scrape', async () => {
      reading = await providers.site.read(ws);
      return { status: 'done', message: reading.note };
    });
    await step('brand_kit', async () => {
      if (!reading) return { status: 'failed', message: 'Sem leitura do site para montar a marca.' };
      await data.updateBrandKitByMachine(workspaceId, 'colors', reading.palette);
      await data.updateBrandKitByMachine(workspaceId, 'fonts', [{ family: 'Manrope', role: 'heading' }, { family: 'Inter', role: 'body' }]);
      return { status: 'done', message: 'Paleta e fontes sugeridas. Revise e envie o logo.' };
    });
    await step('niche', async () => ({ status: 'skipped', message: 'Informe o nicho na tela Marca.' }));
    await step('offers', async () => ({ status: 'skipped', message: 'Cadastre a primeira oferta à mão.' }));
    await step('icps', async () => ({ status: 'skipped', message: 'Crie a primeira persona à mão.' }));
    await step('knowledge', async () => ({ status: 'skipped', message: 'Envie PDFs na tela Conhecimento.' }));
    await step('archetype', async () => ({ status: 'skipped', message: 'Precisa do formulário do cliente.' }));
    await data.updateWorkspace(workspaceId, { status: 'ready' });
  });
}

/* ------------------------------ geração ------------------------------ */

export function startGeneration(workspaceId: string, creativeIds: string[]) {
  creativeIds.forEach((id, variant) => {
    once(`generate:${id}`, async () => {
      await data.updateCreative(workspaceId, id, { status: 'processing', error: null });
      try {
        await sleep(900 + variant * 450); // simula a fila; mantém o card de progresso visível
        const creative = await data.getCreative(workspaceId, id);
        const brand = await data.getBrandKit(workspaceId);
        const offer = creative.offerId ? await data.getOffer(workspaceId, creative.offerId).catch(() => null) : null;
        const icp = creative.icpId ? await data.getIcp(workspaceId, creative.icpId).catch(() => null) : null;
        const { w, h } = PLACEMENTS[creative.placement];

        const copy = await providers.copy.write({ brand, offer, icp, brief: creative.brief, variant });
        const background = await providers.image.background({ brand, creative, variant, width: w, height: h });

        let logoPng: Buffer | null = null;
        if (brand.logoPath) {
          const file = await readFile(brand.logoPath);
          if (file) logoPng = await logoToPng(file, brand.logoPath);
        }
        const accent = brand.colors.find((c) => c.role === 'accent')?.hex ?? '#F5C33B';
        const png = await composeAd({
          width: w, height: h, background, logoPng, companyName: brand.companyName ?? '',
          headline: copy.headline, subhead: copy.subhead, cta: copy.cta, accent,
        });

        const path = await saveFile(`creatives/${workspaceId}/${id}/v${creative.currentVersion + 1}.png`, png, 'image/png');
        const version = await data.addVersion(workspaceId, id, {
          mediaPaths: [path], headline: copy.headline, body: copy.caption, cta: copy.cta,
          editInstruction: null, generator: `${providers.copy.name} + ${providers.image.name}`, costCents: providers.image.costCents,
        });
        await data.recordCost({ workspaceId, provider: 'image', operation: 'generate-creative', costCents: providers.image.costCents, idempotencyKey: `generate:${id}:${version}` });
      } catch (e) {
        console.error(`[generate ${id}]`, e);
        await data.updateCreative(workspaceId, id, { status: 'failed', error: 'A geração falhou. Tente de novo.' }).catch(() => {});
      }
    });
  });
}

/** Se o servidor reiniciar no meio, cria-se um job órfão. Retoma o que ficou na fila (chamado ao abrir a tela). */
export async function resumeStuck(workspaceId: string) {
  const stuck = await data.pendingCreatives(workspaceId);
  if (stuck.length) startGeneration(workspaceId, stuck.map((c) => c.id));
  const ws = await data.getWorkspaceById(workspaceId);
  if (ws?.status === 'onboarding') startOnboarding(workspaceId);
}
