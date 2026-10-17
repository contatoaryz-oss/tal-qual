import sharp from 'sharp';
import { test, expect } from './fixtures';
import { db } from './db';

// F01 — Cadastrar cliente e entender o negócio (S01, S02, S03)

async function newClient(page: import('@playwright/test').Page, source: string, name?: string) {
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill(source);
  if (name) await page.getByLabel('Nome do cliente (opcional)').fill(name);
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await page.waitForURL(/\/w\/[^/]+\/onboarding$/);
  await expect(page.getByRole('heading', { name: 'Leitura concluída' })).toBeVisible({ timeout: 30_000 });
  return page.url().split('/w/')[1].split('/')[0];
}

test('F01-H1 @perfil → leitura em 7 etapas → Marca', async ({ page, axe }) => {
  await newClient(page, '@cafe.teste');
  await expect(page.getByRole('listitem')).toHaveCount(7);
  await axe();
  await page.getByRole('link', { name: 'Revisar a marca' }).click();
  await expect(page.getByRole('heading', { name: 'Marca', level: 1 })).toBeVisible();
  await axe();
});

test('F01-H2 site → nome sugerido do domínio', async ({ page }) => {
  const slug = await newClient(page, 'loja-boa.com.br');
  expect(slug).toBe('loja-boa');
  await page.goto('/');
  await expect(page.getByText('Loja Boa', { exact: true })).toBeVisible();
});

test('F01-H3 tom de voz pelo teclado: Ctrl+Enter salva, Esc cancela, foco volta', async ({ page }) => {
  await page.goto('/w/pisos-exemplo/marca');
  const read = page.getByRole('button', { name: /^Editar tom de voz/ });
  await read.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Rascunho que vai ser descartado');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Editar tom de voz/ })).toBeFocused();
  await expect(page.getByRole('button', { name: /^Editar tom de voz/ })).not.toContainText('descartado');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Control+A');
  await page.keyboard.type('Direto, prático e confiante.');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('status').filter({ hasText: 'salvo' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Editar tom de voz/ })).toBeFocused();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Editar tom de voz/ })).toContainText('Direto, prático e confiante.');
  await expect(page.getByRole('img', { name: 'editado por você' })).toHaveCount(1);
});

test('F01-H4 cor persiste e o campo fica marcado como editado', async ({ page }) => {
  await page.goto('/w/pisos-exemplo/marca');
  await page.getByLabel('Código da cor 2').fill('#C0392B');
  await page.getByRole('button', { name: 'Salvar cores' }).click();
  await expect(page.getByText('Cores salvas')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Código da cor 2')).toHaveValue('#C0392B');
  const [row] = await db`select 'colors' = any(edited_fields) as edited from brand_kits b join workspaces w on w.id = b.workspace_id where w.slug = 'pisos-exemplo'`;
  expect(row.edited).toBe(true);
});

test('F01-H5 logo PNG aparece na Marca', async ({ page }) => {
  const png = await sharp({ create: { width: 300, height: 120, channels: 4, background: { r: 30, g: 60, b: 120, alpha: 1 } } }).png().toBuffer();
  await page.goto('/w/doceria-exemplo/marca');
  await page.locator('input[name=logo]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Logo atualizado.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Logo atual do cliente' })).toBeVisible();
});

test('F01-E1 vazio e texto que não é site nem @', async ({ page }) => {
  await page.goto('/novo');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await expect(page.getByText('Use um endereço de site')).toBeVisible();
  await page.getByLabel('Site ou @ do Instagram').fill('isso não é um site');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await expect(page.getByLabel('Site ou @ do Instagram')).toHaveAttribute('aria-invalid', 'true');
});

test('F01-E2 acento e emoji no nome → slug limpo, nome exibido certo', async ({ page }) => {
  const slug = await newClient(page, '@cafe.sj', 'Café São João ☕');
  expect(slug).toBe('cafe-sao-joao');
  await page.goto(`/w/${slug}/marca`);
  await expect(page.getByRole('button', { name: /Cliente atual: Café São João ☕/ })).toBeVisible();
});

test('F01-E3 nome com 80 caracteres cabe no layout', async ({ page }) => {
  const name = 'Comércio de Materiais de Construção e Acabamentos Finos do Vale do Rio dos Sinos'.slice(0, 80);
  const slug = await newClient(page, '@nome.longo', name);
  await page.goto(`/w/${slug}/marca`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('F01-E4 dois clientes com o mesmo nome → slugs diferentes', async ({ page }) => {
  const a = await newClient(page, '@gemeo.um', 'Gêmeo');
  const b = await newClient(page, '@gemeo.dois', 'Gêmeo');
  expect(a).toBe('gemeo');
  expect(b).toBe('gemeo-2');
});

test('F01-E5 clique duplo em "Ler o negócio" cria um cliente só', async ({ page }) => {
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@clique.duplo');
  await page.getByRole('button', { name: 'Ler o negócio' }).dblclick();
  await page.waitForURL(/onboarding$/);
  await page.waitForTimeout(1500);
  const [{ n }] = await db`select count(*)::int as n from workspaces where instagram_handle = 'clique.duplo'`;
  expect(n).toBe(1);
});

test('F01-E6 recarregar no meio da leitura → continua e termina', async ({ page }) => {
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@recarrega.meio');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await page.waitForURL(/onboarding$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Leitura concluída' })).toBeVisible({ timeout: 30_000 });
});

test('F01-E7 logo maior que 10 MB → mensagem clara', async ({ page }) => {
  await page.goto('/w/doceria-exemplo/marca');
  await page.locator('input[name=logo]').setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(11 * 1024 * 1024, 1) });
  await expect(page.getByText(/passa de 10 MB/)).toBeVisible();
});

test('F01-E8 arquivo que não é imagem com extensão .png → mensagem clara', async ({ page }) => {
  await page.goto('/w/doceria-exemplo/marca');
  await page.locator('input[name=logo]').setInputFiles({ name: 'falso.png', mimeType: 'image/png', buffer: Buffer.from('isto não é uma imagem') });
  await expect(page.getByText('Não conseguimos ler esta imagem. Tente outro arquivo.')).toBeVisible();
});

test('F01-E9 hex inválido desabilita salvar', async ({ page }) => {
  await page.goto('/w/pisos-exemplo/marca');
  await page.getByLabel('Código da cor 1').fill('#12');
  await expect(page.getByRole('button', { name: 'Salvar cores' })).toBeDisabled();
  await expect(page.getByRole('alert').filter({ hasText: '#RRGGBB' })).toBeVisible();
});

test('F01-E10 390 px, tema escuro, acessível', async ({ browser, axe }) => {
  const ctx = await browser.newContext({ storageState: 'e2e/.auth/demo.json', viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  for (const path of ['/novo', '/w/pisos-exemplo/marca', '/w/pisos-exemplo/onboarding']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await axe(page);
  }
  await ctx.close();
});

test('F01-N1 sem conexão ao enviar → mensagem, sem tela de erro', async ({ page, context }) => {
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@sem.rede');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await expect(page.getByText(/sem conexão|conexão/i)).toBeVisible({ timeout: 10_000 });
  await context.setOffline(false);
});
