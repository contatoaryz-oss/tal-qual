import { test, expect } from './fixtures';
import { db } from './db';

// F02 — Personas e ofertas (S05–S08), no cliente "Doceria Exemplo" do seed.
const W = '/w/doceria-exemplo';

async function createIcp(page: import('@playwright/test').Page, name: string, pains = '', goals = '') {
  await page.goto(`${W}/personas/nova`);
  await page.getByLabel('Nome da persona').fill(name);
  if (pains) await page.getByLabel('Dores').fill(pains);
  if (goals) await page.getByLabel('O que ela quer').fill(goals);
  await page.getByRole('button', { name: 'Criar persona' }).click();
  await page.waitForURL(/\/personas\/[0-9a-f-]{36}\?salvo=1$/);
  return page.url().split('/personas/')[1].split('?')[0];
}

async function createOffer(page: import('@playwright/test').Page, title: string, price = '', icpNames: string[] = []) {
  await page.goto(`${W}/ofertas/nova`);
  await page.getByLabel('Nome da oferta').fill(title);
  if (price) await page.getByLabel('Preço (opcional)').fill(price);
  for (const n of icpNames) await page.getByRole('checkbox', { name: n }).check();
  await page.getByRole('button', { name: 'Criar oferta' }).click();
  await page.waitForURL(/\/ofertas\/[0-9a-f-]{36}\?salvo=1$/);
  return page.url().split('/ofertas/')[1].split('?')[0];
}

test('F02-H1 criar persona → detalhe → editar idade', async ({ page, axe }) => {
  await page.goto(`${W}/personas`);
  await axe();
  await createIcp(page, 'Noiva planejando o casamento', 'Medo de atrasar\nOrçamento apertado', 'Mesa de doces linda');
  await expect(page.getByRole('heading', { name: 'Noiva planejando o casamento' })).toBeVisible();
  await page.getByLabel('Faixa de idade').fill('25–35');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Persona salva.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Faixa de idade')).toHaveValue('25–35');
  await axe();
});

test('F02-H2 oferta com preço e persona → vira principal', async ({ page, axe }) => {
  await createIcp(page, 'Empresa encomendando kit');
  await createOffer(page, 'Kit corporativo de brigadeiros', '189,90', ['Empresa encomendando kit']);
  const row = page.getByRole('listitem').filter({ hasText: 'Empresa encomendando kit' });
  await expect(row.getByText('principal', { exact: true })).toBeVisible();
  await axe();
  await page.goto(`${W}/ofertas`);
  await expect(page.getByRole('listitem').filter({ hasText: 'Kit corporativo de brigadeiros' })).toContainText('R$ 189,90');
});

test('F02-H3 trocar a principal; desvincular a principal → a próxima assume', async ({ page }) => {
  await createIcp(page, 'Persona A');
  await createIcp(page, 'Persona B');
  await createOffer(page, 'Oferta com duas personas', '', ['Persona A', 'Persona B']);
  const rowA = page.getByRole('listitem').filter({ hasText: 'Persona A' });
  const rowB = page.getByRole('listitem').filter({ hasText: 'Persona B' });
  await expect(rowA.getByText('principal', { exact: true })).toBeVisible();
  await rowB.getByRole('button', { name: 'Tornar principal' }).click();
  await expect(rowB.getByText('principal', { exact: true })).toBeVisible();
  await expect(rowA.getByText('principal', { exact: true })).toHaveCount(0);
  await rowB.getByRole('checkbox').click();
  await expect(rowB.getByRole('checkbox')).not.toBeChecked();
  await expect(rowA.getByText('principal', { exact: true })).toBeVisible();
});

test('F02-H4 apagar persona → some da oferta; dado relacionado fica', async ({ page }) => {
  const id = await createIcp(page, 'Persona temporária');
  await createOffer(page, 'Oferta da temporária', '', ['Persona temporária']);
  await page.goto(`${W}/personas/${id}`);
  await page.getByRole('button', { name: 'Apagar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Apagar' }).click();
  await page.waitForURL(`**${W}/personas`);
  await expect(page.getByText('Persona temporária')).toHaveCount(0);
  const [{ n }] = await db`select count(*)::int as n from offers where title = 'Oferta da temporária'`;
  expect(n).toBe(1);
});

test('F02-E1 validações: nome vazio, preço "abc" e "1,2,3"', async ({ page }) => {
  await page.goto(`${W}/personas/nova`);
  await page.getByRole('button', { name: 'Criar persona' }).click();
  await expect(page.getByText('Dê um nome à persona.')).toBeVisible();
  await page.goto(`${W}/ofertas/nova`);
  await page.getByLabel('Nome da oferta').fill('X');
  await page.getByLabel('Preço (opcional)').fill('abc');
  await page.getByRole('button', { name: 'Criar oferta' }).click();
  await expect(page.getByText('Dê um nome à oferta.')).toBeVisible();
  await expect(page.getByText('Use só números. Ex.: 89,90')).toBeVisible();
  await page.getByLabel('Preço (opcional)').fill('1,2,3');
  await page.getByRole('button', { name: 'Criar oferta' }).click();
  await expect(page.getByText('Use só números. Ex.: 89,90')).toBeVisible();
});

test('F02-E2 preço "R$ 1.299,00"', async ({ page }) => {
  await createOffer(page, 'Bolo de casamento três andares', 'R$ 1.299,00');
  await page.goto(`${W}/ofertas`);
  await expect(page.getByText('R$ 1.299,00')).toBeVisible();
});

test('F02-E3 13 dores: nenhuma some sem aviso', async ({ page }) => {
  const pains = Array.from({ length: 13 }, (_, i) => `Dor número ${i + 1}`).join('\n');
  const id = await createIcp(page, 'Persona com muitas dores', pains);
  const [{ n }] = await db`select cardinality(pain_points)::int as n from icps where id = ${id}`;
  expect(n, 'a 13ª dor foi descartada em silêncio').toBe(13);
  // acima do limite: erro no campo, nada some
  await page.goto(`${W}/personas/nova`);
  await page.getByLabel('Nome da persona').fill('Persona com dores demais');
  await page.getByLabel('Dores').fill(Array.from({ length: 31 }, (_, i) => `Dor ${i + 1}`).join('\n'));
  await page.getByRole('button', { name: 'Criar persona' }).click();
  await expect(page.getByText('Use até 30 itens (tem 31).')).toBeVisible();
  await expect(page.getByLabel('Dores')).toHaveValue(/Dor 31$/);
});

test('F02-E4 emoji e acento no nome da oferta', async ({ page }) => {
  await createOffer(page, 'Pão de mel 🍯 com açúcar');
  await expect(page.getByRole('heading', { name: 'Pão de mel 🍯 com açúcar' })).toBeVisible();
});

test.describe('404', () => {
  test.use({ allow404: true });
  test('F02-E5 id inválido ou inexistente → 404', async ({ page }) => {
    for (const path of [`${W}/personas/abc`, `${W}/ofertas/abc`, `${W}/personas/00000000-0000-4000-8000-000000000000`, `${W}/ofertas/00000000-0000-4000-8000-000000000000`]) {
      const r = await page.goto(path);
      expect(r?.status(), path).toBe(404);
    }
  });
  test('F02-N1 abrir persona apagada → 404', async ({ page }) => {
    const id = await createIcp(page, 'Persona que vai sumir');
    await db`delete from icps where id = ${id}`;
    const r = await page.goto(`${W}/personas/${id}`);
    expect(r?.status()).toBe(404);
  });
});
