import { spawnSync } from 'node:child_process';
import { test, expect, anon } from './fixtures';
import { db, DATABASE_URL } from './db';
import { signUpAndConfirm } from './helpers';

// X01–X02 — Isolamento entre agências e arquivos. Usuário B = agência nova, sem nada.
test.use({ ...anon, allow404: true });

async function demoIds() {
  const [c] = await db`select c.id, c.batch_id, v.media_paths[1] as file from creatives c join creative_versions v on v.creative_id = c.id
    join workspaces w on w.id = c.workspace_id where w.slug = 'pisos-exemplo' and v.media_paths[1] is not null limit 1`;
  const [i] = await db`select i.id from icps i join workspaces w on w.id = i.workspace_id where w.slug = 'pisos-exemplo' limit 1`;
  const [o] = await db`select o.id from offers o join workspaces w on w.id = o.workspace_id where w.slug = 'pisos-exemplo' limit 1`;
  return { creative: c?.id, batch: c?.batchId ?? c?.batch_id, file: c?.file, icp: i.id, offer: o.id };
}

test('X01-H1/H2 segundo usuário: 0 clientes; mesmo slug não dá acesso ao do outro', async ({ page }) => {
  // garante que o demo tem pelo menos um criativo com arquivo
  const ids0 = await demoIds();
  test.skip(!ids0.creative, 'seed sem criativo — rode f06 antes');
  await signUpAndConfirm(page, `intruso${Date.now()}@exemplo.com.br`);
  await expect(page.getByText('Nenhum cliente ainda')).toBeVisible();
  for (const path of ['/w/pisos-exemplo', '/w/pisos-exemplo/marca', '/w/pisos-exemplo/galeria']) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  // B cria um cliente com o mesmo nome → mesmo slug, outra agência
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@pisos.b');
  await page.getByLabel('Nome do cliente (opcional)').fill('Pisos Exemplo');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await page.waitForURL('**/w/pisos-exemplo/onboarding');
  const ids = await demoIds();
  for (const path of [`/w/pisos-exemplo/galeria/${ids.creative}`, `/w/pisos-exemplo/criar/lote/${ids.batch}`, `/w/pisos-exemplo/personas/${ids.icp}`, `/w/pisos-exemplo/ofertas/${ids.offer}`]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
  await page.goto('/w/pisos-exemplo/ofertas');
  await expect(page.getByText('Instalação de piso vinílico')).toHaveCount(0);
});

test('X01-H3 SQL: intruso 0 linhas, não escreve; membro não altera o teto; anon sem acesso', async () => {
  const r = spawnSync('psql', [DATABASE_URL, '-qAt', '-f', 'dev/local-supabase/rls-test.sql'], { encoding: 'utf8' });
  const out = r.stdout + r.stderr;
  expect(r.status, out).toBe(0);
  expect(out).not.toMatch(/FALHA/);
  expect(out.match(/OK:/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
});

test('X02-N1 arquivo de outra agência ou sem login → 404', async ({ page, request }) => {
  const { file } = await demoIds();
  test.skip(!file, 'sem arquivo');
  expect((await request.get(`/api/files/${file}`)).status()).toBe(404);
  await signUpAndConfirm(page, `intruso${Date.now()}b@exemplo.com.br`);
  expect((await page.request.get(`/api/files/${file}`)).status()).toBe(404);
});

test('X02-N2 caminho com .. ou malformado → 404', async ({ page }) => {
  await signUpAndConfirm(page, `curioso${Date.now()}@exemplo.com.br`);
  for (const p of ['/api/files/..%2F..%2F.env.local', '/api/files/%2e%2e/%2e%2e/package.json', '/api/files/abc', '/api/files/00000000-0000-4000-8000-000000000000/../../x']) {
    const r = await page.request.get(p);
    expect(r.status(), p).toBe(404);
  }
});

test('E-STUB-1 telas de marcos futuros abrem com aviso', async ({ page }) => {
  await signUpAndConfirm(page, `stub${Date.now()}@exemplo.com.br`);
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@stub.teste');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await page.waitForURL(/onboarding$/);
  const slug = page.url().split('/w/')[1].split('/')[0];
  for (const s of ['concorrentes', 'tendencias', 'proximos-passos', 'semana', 'anuncios', 'inspiracao', 'swipe', 'conhecimento', 'agente', 'desempenho', 'nota']) {
    const r = await page.goto(`/w/${slug}/${s}`);
    expect(r?.status(), s).toBe(200);
    await expect(page.getByText(/Esta tela entra no marco M\d/), s).toBeVisible();
  }
});
