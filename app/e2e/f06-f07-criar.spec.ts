import sharp from 'sharp';
import { test, expect } from './fixtures';
import { db } from './db';

// F06 — Gerar conteúdo (S15–S17) · F07 — Revisar (S18, parcial)
const W = '/w/pisos-exemplo';

async function generate(page: import('@playwright/test').Page, opts: { count?: number; offer?: string; placement?: string } = {}) {
  await page.goto(`${W}/criar`);
  if (opts.offer) await page.getByLabel('Oferta').selectOption({ label: opts.offer });
  if (opts.placement) await page.locator('label', { hasText: opts.placement }).click();
  const n = opts.count ?? 1;
  await page.getByLabel('Quantas variações').selectOption(String(n));
  await page.getByRole('button', { name: `Gerar ${n} ${n === 1 ? 'arte' : 'artes'}` }).click();
  await page.waitForURL(/\/criar\/lote\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { name: 'Artes prontas' })).toBeVisible({ timeout: 45_000 });
  return page.url().split('/lote/')[1];
}

async function imageSize(page: import('@playwright/test').Page, src: string) {
  const buf = Buffer.from(await (await page.request.get(src)).body());
  const meta = await sharp(buf).metadata();
  return { w: meta.width, h: meta.height, buf };
}

test('F06-H1 oferta → persona principal sozinha → 3 artes → galeria', async ({ page, axe }) => {
  await page.goto(`${W}/criar`);
  await expect(page.getByLabel('Persona')).toHaveValue(/[0-9a-f-]{36}/);
  await axe();
  const batch = await generate(page, { count: 3 });
  await axe();
  const [{ n }] = await db`select count(*)::int as n from creatives where batch_id = ${batch} and status = 'succeeded'`;
  expect(n).toBe(3);
  await page.getByRole('link', { name: 'Ver galeria' }).click();
  await expect(page.getByRole('link', { name: /Feed do Instagram/ }).first()).toBeVisible();
  await axe();
});

test('F06-H2 stories 9:16 → PNG 1080×1920', async ({ page }) => {
  await generate(page, { placement: 'Stories e Reels' });
  const src = await page.locator('a[aria-label^="Abrir variação 1"] img').getAttribute('src');
  const { w, h } = await imageSize(page, src!);
  expect([w, h]).toEqual([1080, 1920]);
});

test('F06-E1 clique duplo em "Gerar" → uma leva só', async ({ page }) => {
  await page.goto(`${W}/criar`);
  const [{ before }] = await db`select count(*)::int as before from creatives`;
  await page.getByLabel('Quantas variações').selectOption('1');
  await page.getByRole('button', { name: 'Gerar 1 arte' }).dblclick();
  await page.waitForURL(/\/criar\/lote\//);
  await page.waitForTimeout(1500);
  const [{ after }] = await db`select count(*)::int as after from creatives`;
  expect(after - before, 'clique duplo criou mais de uma leva').toBe(1);
});

test('F06-E2 título de 100 caracteres: arte legível, sem cortar palavra no meio', async ({ page }) => {
  const title = 'Piso vinílico instalado com rodapé, acabamento completo e garantia estendida para sala, quarto e corredor'.slice(0, 100);
  await page.goto(`${W}/ofertas/nova`);
  await page.getByLabel('Nome da oferta').fill(title);
  await page.getByRole('button', { name: 'Criar oferta' }).click();
  await page.waitForURL(/\?salvo=1$/);
  await generate(page, { offer: title });
  const [c] = await db`select headline from creatives order by created_at desc limit 1`;
  const head = c.headline as string;
  const cutMidWord = head.length < title.length && !/[\s.,…]$/.test(head) && title[head.length] !== ' ' && !head.endsWith('…');
  expect(cutMidWord, `headline "${head}"`).toBe(false);
});

test('F06-E3 emoji no título da oferta → arte gera', async ({ page }) => {
  await page.goto(`${W}/ofertas/nova`);
  await page.getByLabel('Nome da oferta').fill('Promoção de inverno ❄️ piso quentinho');
  await page.getByRole('button', { name: 'Criar oferta' }).click();
  await page.waitForURL(/\?salvo=1$/);
  await generate(page, { offer: 'Promoção de inverno ❄️ piso quentinho' });
  await expect(page.getByText('pronta', { exact: true })).toBeVisible();
});

test('F06-E4 cliente sem oferta → caminho para cadastrar', async ({ page }) => {
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@sem.oferta');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await page.waitForURL(/onboarding$/);
  await page.goto('/w/sem-oferta/criar');
  await expect(page.getByRole('link', { name: 'Cadastrar oferta' })).toBeVisible();
});

test('F06-E5 cliente sem cores → bloqueado com o motivo', async ({ page }) => {
  await db`update brand_kits set colors = '[]' where workspace_id = (select id from workspaces where slug = 'doceria-exemplo')`;
  await page.goto('/w/doceria-exemplo/criar');
  await expect(page.getByText('A marca ainda não tem cores.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Gerar/ })).toBeDisabled();
  await db`update brand_kits set colors = '[{"hex":"#5A2D82","role":"primary"},{"hex":"#F5C33B","role":"accent"}]' where workspace_id = (select id from workspaces where slug = 'doceria-exemplo')`;
});

test('F06-E6 recarregar o lote no meio → termina', async ({ page }) => {
  await page.goto(`${W}/criar`);
  await page.getByLabel('Quantas variações').selectOption('2');
  await page.getByRole('button', { name: 'Gerar 2 artes' }).click();
  await page.waitForURL(/\/criar\/lote\//);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Artes prontas' })).toBeVisible({ timeout: 45_000 });
});

test('F06-E7 apagar a oferta enquanto gera → termina sem erro', async ({ page }) => {
  await page.goto(`${W}/ofertas/nova`);
  await page.getByLabel('Nome da oferta').fill('Oferta que some no meio');
  await page.getByRole('button', { name: 'Criar oferta' }).click();
  await page.waitForURL(/\?salvo=1$/);
  await page.goto(`${W}/criar`);
  await page.getByLabel('Oferta').selectOption({ label: 'Oferta que some no meio' });
  await page.getByLabel('Quantas variações').selectOption('2');
  await page.getByRole('button', { name: 'Gerar 2 artes' }).click();
  await page.waitForURL(/\/criar\/lote\//);
  await db`delete from offers where title = 'Oferta que some no meio'`;
  await expect(page.getByRole('heading', { name: 'Artes prontas' })).toBeVisible({ timeout: 45_000 });
});

test.describe('404', () => {
  test.use({ allow404: true });
  test('F06-N1 lote ou criativo com id inválido/inexistente → 404', async ({ page }) => {
    for (const path of [`${W}/criar/lote/abc`, `${W}/criar/lote/00000000-0000-4000-8000-000000000000`, `${W}/galeria/abc`]) {
      const r = await page.goto(path);
      expect(r?.status(), path).toBe(404);
    }
  });
});

test('F07-H1 criativo: prévia, texto, versões; PNG válido', async ({ page, axe }) => {
  await generate(page);
  await page.locator('a[aria-label^="Abrir variação 1"]').click();
  await page.waitForURL(/\/galeria\/[0-9a-f-]{36}$/);
  await axe();
  await page.getByRole('tab', { name: 'Texto' }).click();
  await expect(page.getByRole('heading', { name: 'Legenda' })).toBeVisible();
  await page.getByRole('tab', { name: /Versões/ }).click();
  await expect(page.getByText('Versão 1')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Baixar PNG' }).click();
  const file = await (await download).path();
  const meta = await sharp(file).metadata();
  expect(meta.format).toBe('png');
});

test('F07-H2 favoritar → filtro Favoritas', async ({ page }) => {
  const [{ before }] = await db`select count(*)::int as before from creatives c join workspaces w on w.id = c.workspace_id where w.slug = 'pisos-exemplo' and c.favorite`;
  await generate(page);
  await page.locator('a[aria-label^="Abrir variação 1"]').click();
  // espera o servidor gravar (o botão muda na hora, otimista; sair antes disso é corrida do teste)
  const saved = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/galeria/'));
  await page.getByRole('button', { name: 'Marcar como favorito' }).click();
  await expect(page.getByRole('button', { name: 'Tirar dos favoritos' })).toBeVisible();
  await saved;
  await page.goto(`${W}/galeria?filtro=favoritas`);
  await expect(page.getByRole('link', { name: /Feed do Instagram/ })).toHaveCount(before + 1);
});

test('F07-H3 mais uma variação → lote novo de 1', async ({ page }) => {
  const first = await generate(page);
  await page.locator('a[aria-label^="Abrir variação 1"]').click();
  await page.getByRole('button', { name: 'Mais uma variação' }).click();
  await page.waitForURL((u) => u.pathname.includes('/criar/lote/') && !u.pathname.endsWith(first));
  await expect(page.getByRole('heading', { name: 'Artes prontas' })).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Variação 1')).toBeVisible();
});

test('F07-H4 apagar criativo → some e o arquivo some do armazenamento', async ({ page }) => {
  await generate(page);
  await page.locator('a[aria-label^="Abrir variação 1"]').click();
  await page.waitForURL(/\/galeria\/[0-9a-f-]{36}$/);
  const id = page.url().split('/galeria/')[1];
  const [{ path }] = await db`select media_paths[1] as path from creative_versions where creative_id = ${id}`;
  await page.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click();
  await page.waitForURL(`**${W}/galeria`);
  const fs = await import('node:fs');
  expect(fs.existsSync(`.data/files/${path}`), 'arquivo ficou no disco').toBe(false);
});
