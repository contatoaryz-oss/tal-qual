import 'server-only';
import * as data from '../data';
import { readFile, saveFile } from '../data/store';
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
  fn().catch((err) => console.error(`[job ${key}]`, err)).finally(() => running.delete(key));
}

/* ------------------------------ onboarding ------------------------------ */

export function startOnboarding(workspaceId: string) {
  once(`onboard:${workspaceId}`, async () => {
    const ws = data.getWorkspaceById(workspaceId);
    if (!ws) return;
    const step = async (stage: StageKey, fn: () => Promise<{ status: 'done' | 'skipped' | 'failed'; message?: string }>) => {
      data.setStage(workspaceId, stage, 'running');
      await sleep(700);
      try {
        const r = await fn();
        data.setStage(workspaceId, stage, r.status, r.message ?? null);
      } catch (e) {
        data.setStage(workspaceId, stage, 'failed', e instanceof Error ? e.message : 'Erro inesperado');
      }
    };

    let reading: Awaited<ReturnType<typeof providers.site.read>> | null = null;
    await step('scrape', async () => {
      reading = await providers.site.read(ws);
      return { status: 'done', message: reading.note };
    });
    await step('brand_kit', async () => {
      if (!reading) return { status: 'failed', message: 'Sem leitura do site para montar a marca.' };
      data.updateBrandKit(workspaceId, 'colors', reading.palette, { byHuman: false });
      data.updateBrandKit(workspaceId, 'fonts', [{ family: 'Manrope', role: 'heading' }, { family: 'Inter', role: 'body' }], { byHuman: false });
      return { status: 'done', message: 'Paleta e fontes sugeridas. Revise e envie o logo.' };
    });
    await step('niche', async () => ({ status: 'skipped', message: 'Informe o nicho na tela Marca.' }));
    await step('offers', async () => ({ status: 'skipped', message: 'Cadastre a primeira oferta à mão.' }));
    await step('icps', async () => ({ status: 'skipped', message: 'Crie a primeira persona à mão.' }));
    await step('knowledge', async () => ({ status: 'skipped', message: 'Envie PDFs na tela Conhecimento.' }));
    await step('archetype', async () => ({ status: 'skipped', message: 'Precisa do formulário do cliente.' }));
    data.updateWorkspace(workspaceId, { status: 'ready' });
  });
}

/* ------------------------------ geração ------------------------------ */

export function startGeneration(workspaceId: string, creativeIds: string[]) {
  creativeIds.forEach((id, variant) => {
    once(`generate:${id}`, async () => {
      data.updateCreative(workspaceId, id, { status: 'processing', error: null });
      try {
        await sleep(900 + variant * 450); // simula a fila; mantém o card de progresso visível
        const creative = data.getCreative(workspaceId, id);
        const brand = data.getBrandKit(workspaceId);
        const offer = creative.offerId ? data.getOffer(workspaceId, creative.offerId) : null;
        const icp = creative.icpId ? data.getIcp(workspaceId, creative.icpId) : null;
        const { w, h } = PLACEMENTS[creative.placement];

        const copy = await providers.copy.write({ brand, offer, icp, brief: creative.brief, variant });
        const background = await providers.image.background({ brand, creative, variant, width: w, height: h });

        let logoPng: Buffer | null = null;
        if (brand.logoPath) {
          const file = readFile(brand.logoPath);
          if (file) logoPng = await logoToPng(file, brand.logoPath);
        }
        const accent = brand.colors.find((c) => c.role === 'accent')?.hex ?? '#F5C33B';
        const png = await composeAd({
          width: w, height: h, background, logoPng, companyName: brand.companyName ?? '',
          headline: copy.headline, subhead: copy.subhead, cta: copy.cta, accent,
        });

        const path = saveFile(`creatives/${workspaceId}/${id}/v${creative.currentVersion + 1}.png`, png);
        data.addVersion(workspaceId, id, {
          mediaPaths: [path], headline: copy.headline, body: copy.caption, cta: copy.cta,
          editInstruction: null, generator: `${providers.copy.name} + ${providers.image.name}`, costCents: providers.image.costCents,
        });
        data.recordCost({ workspaceId, provider: 'image', operation: 'generate-creative', costCents: providers.image.costCents, idempotencyKey: `generate:${id}:1` });
      } catch (e) {
        data.updateCreative(workspaceId, id, { status: 'failed', error: e instanceof Error ? e.message : 'Erro inesperado' });
      }
    });
  });
}

/** Se o servidor reiniciar no meio, cria-se um job órfão. Retoma o que ficou na fila (chamado ao abrir a tela). */
export function resumeStuck(workspaceId: string) {
  const stuck = data.listCreatives(workspaceId).filter((c) => c.status === 'queued' || c.status === 'processing');
  if (stuck.length) startGeneration(workspaceId, stuck.map((c) => c.id));
  const ws = data.getWorkspaceById(workspaceId);
  if (ws?.status === 'onboarding') startOnboarding(workspaceId);
}
