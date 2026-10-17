import { test, expect, anon } from './fixtures';
import { db, lastLink, mailbox } from './db';
import type { BrowserContext, Page } from '@playwright/test';
import { signUpAndConfirm, PW } from './helpers';

// A01–A05 — Login e conta. Usuários novos por teste (o demo continua intacto para as outras specs).
test.use(anon);

let n = 0;
const fresh = () => `teste${Date.now()}${n++}@exemplo.com.br`;

async function signIn(page: Page, email: string, pw = PW, next = '') {
  await page.goto(`/entrar${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(pw);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

/** Lê/regrava o cookie de sessão do @supabase/ssr (base64, pode vir em pedaços .0 .1). */
async function editSession(ctx: BrowserContext, edit: (s: any) => void) {
  const all = (await ctx.cookies()).filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name));
  const base = all[0].name.replace(/\.\d+$/, '');
  const raw = all.map((c) => c.value).join('');
  const s = JSON.parse(Buffer.from(raw.replace(/^base64-/, ''), 'base64url').toString());
  edit(s);
  await ctx.clearCookies({ name: new RegExp(`^${base}`) });
  await ctx.addCookies([{ ...all[0], name: base, value: 'base64-' + Buffer.from(JSON.stringify(s)).toString('base64url') }]);
}

test('A01-H1 criar conta → e-mail pt-BR → confirmar → agência vazia', async ({ page, axe }) => {
  await page.goto('/criar-conta');
  await axe();
  const email = fresh();
  await signUpAndConfirm(page, email);
  await expect(page.getByText('Nenhum cliente ainda')).toBeVisible();
  const mail = (await mailbox(email)).find((m) => m.type === 'signup')!;
  expect(mail.html).toContain('Confirmar');
});

test('A01-E1 validações do cadastro', async ({ page }) => {
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill('nao-e-email');
  await page.getByLabel('Senha', { exact: true }).fill('curta');
  await page.getByLabel('Repita a senha').fill('outra');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByText('Digite um e-mail válido.')).toBeVisible();
  await expect(page.getByText('Use pelo menos 8 caracteres.')).toBeVisible();
  await expect(page.getByText('As senhas não batem.')).toBeVisible();
});

test('A01-E2 cadastrar de novo um e-mail confirmado → mesma resposta, sem vazar', async ({ page }) => {
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill('demo@exemplo.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(PW);
  await page.getByLabel('Repita a senha').fill(PW);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Falta confirmar o e-mail' })).toBeVisible();
  const [{ n }] = await db`select count(*)::int as n from auth.users where email = 'demo@exemplo.com.br'`;
  expect(n).toBe(1);
});

test('A01-N1 entrar antes de confirmar → "confirme seu e-mail"', async ({ page }) => {
  const email = fresh();
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PW);
  await page.getByLabel('Repita a senha').fill(PW);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Falta confirmar o e-mail' })).toBeVisible();
  await signIn(page, email);
  await expect(page.locator('p[role=alert]')).toContainText('Confirme seu e-mail');
});

test('A02-H1 entrar com senha → volta para a página pedida', async ({ page, axe }) => {
  await page.goto('/w/pisos-exemplo/ofertas');
  await page.waitForURL(/\/entrar\?next=/);
  await axe();
  await page.getByLabel('E-mail').fill('demo@exemplo.com.br');
  await page.getByLabel('Senha', { exact: true }).fill('demo-local-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL('**/w/pisos-exemplo/ofertas');
});

test('A02-H2 link mágico entra uma vez; reusar → "link expirou"', async ({ page, browser }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  await page.context().clearCookies();
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Prefiro receber um link por e-mail' }).click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByRole('button', { name: 'Enviar link de acesso' }).click();
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();
  const link = await lastLink(email, 'magiclink');
  await page.goto(link);
  await page.waitForURL((u) => u.pathname === '/');
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.goto(link);
  await expect(p2.getByText('Esse link expirou ou já foi usado. Peça outro.')).toBeVisible();
  await other.close();
});

test('A02-N1 senha errada → mensagem; 9ª tentativa → bloqueio', async ({ page }) => {
  const email = fresh();
  for (let i = 1; i <= 9; i++) {
    await signIn(page, email, 'errada-' + i);
    await expect(page.locator('p[role=alert]')).toHaveText(i <= 8 ? 'E-mail ou senha incorretos.' : 'Muitas tentativas. Espere alguns minutos e tente de novo.');
  }
});

test('A02-N2 next=//site-externo fica no app', async ({ page }) => {
  for (const next of ['//evil.example', '/\\evil.example', 'https://evil.example']) {
    await signIn(page, 'demo@exemplo.com.br', 'demo-local-123', next);
    await page.waitForURL((u) => u.host === 'localhost:3000' && u.pathname === '/');
    await page.context().clearCookies();
  }
});

test('A03-H1 esqueci a senha → nova senha → a antiga deixa de valer', async ({ page }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  await page.context().clearCookies();
  await page.goto('/esqueci-senha');
  await page.getByLabel('E-mail da conta').fill(email);
  await page.getByRole('button', { name: 'Enviar link' }).click();
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible();
  await page.goto(await lastLink(email, 'recovery'));
  await page.waitForURL('**/redefinir-senha');
  await page.getByLabel('Nova senha', { exact: true }).fill('senha-nova-2026');
  await page.getByLabel('Repita a nova senha').fill('senha-nova-2026');
  await page.getByRole('button', { name: 'Salvar senha' }).click();
  await expect(page.getByText('Senha atualizada')).toBeVisible();
  await page.context().clearCookies();
  await signIn(page, email, PW);
  await expect(page.locator('p[role=alert]')).toHaveText('E-mail ou senha incorretos.');
  await signIn(page, email, 'senha-nova-2026');
  await page.waitForURL((u) => u.pathname === '/');
});

test('A04-H1 sair → voltar no navegador não mostra dado da agência', async ({ page }) => {
  await signIn(page, 'demo@exemplo.com.br', 'demo-local-123');
  await page.waitForURL((u) => u.pathname === '/');
  await page.goto('/w/pisos-exemplo/ofertas');
  await expect(page.getByRole('heading', { name: 'Ofertas' })).toBeVisible();
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Sair deste aparelho' }).click();
  await page.waitForURL('**/entrar?saiu=1');
  await page.goBack();
  await page.goBack();
  await page.waitForLoadState('load');
  await expect(page.getByText('Pisos Exemplo'), 'dado da agência visível depois de sair').toHaveCount(0);
});

test('A04-H2 sair de todos → a outra sessão cai', async ({ page, browser }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await signIn(p2, email);
  await p2.waitForURL((u) => u.pathname === '/');
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Sair de todos os aparelhos' }).click();
  await page.waitForURL('**/entrar?saiu=todos');
  // a outra sessão cai quando o token dela precisa renovar
  await editSession(other, (s) => { s.expires_at = Math.floor(Date.now() / 1000) - 10; });
  await p2.goto('/novo');
  await p2.waitForURL(/\/entrar/);
  await other.close();
});

test('A04-E1 token expirado → renova sozinho, sem deslogar', async ({ page }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  await editSession(page.context(), (s) => { s.expires_at = Math.floor(Date.now() / 1000) - 10; });
  await page.goto('/novo');
  await expect(page.getByRole('heading', { name: /cliente/i })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/novo');
});

test('A04-E2 duas abas: sair numa → ação na outra manda para entrar', async ({ page, context }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  const tab2 = await context.newPage();
  await tab2.goto('/novo');
  await page.goto('/conta');
  await page.getByRole('button', { name: 'Sair deste aparelho' }).click();
  await page.waitForURL('**/entrar?saiu=1');
  await tab2.getByLabel('Site ou @ do Instagram').fill('@outra.aba');
  await tab2.getByRole('button', { name: 'Ler o negócio' }).click();
  await tab2.waitForURL(/\/entrar/);
  const [{ n }] = await db`select count(*)::int as n from workspaces where instagram_handle = 'outra.aba'`;
  expect(n).toBe(0);
});

test('A05-N1 confirmação errada → não apaga', async ({ page }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  await page.goto('/conta');
  await page.getByLabel(`Para confirmar, digite ${email}`).fill('outro@exemplo.com.br');
  await page.getByRole('button', { name: 'Apagar minha conta e os dados' }).click();
  await expect(page.getByLabel(`Para confirmar, digite ${email}`)).toHaveAttribute('aria-invalid', 'true');
  const [{ n }] = await db`select count(*)::int as n from auth.users where email = ${email}`;
  expect(n).toBe(1);
});

test('A05-H1 apagar conta → login e dados somem', async ({ page, axe }) => {
  const email = fresh();
  await signUpAndConfirm(page, email);
  await page.goto('/novo');
  await page.getByLabel('Site ou @ do Instagram').fill('@vai.sumir');
  await page.getByRole('button', { name: 'Ler o negócio' }).click();
  await page.waitForURL(/onboarding$/);
  await page.goto('/conta');
  await axe();
  await page.getByLabel(`Para confirmar, digite ${email}`).fill(email);
  await page.getByRole('button', { name: 'Apagar minha conta e os dados' }).click();
  await page.waitForURL('**/entrar?conta=apagada');
  const [{ u }] = await db`select count(*)::int as u from auth.users where email = ${email}`;
  const [{ w }] = await db`select count(*)::int as w from workspaces where instagram_handle = 'vai.sumir'`;
  expect([u, w]).toEqual([0, 0]);
  await signIn(page, email);
  await expect(page.locator('p[role=alert]')).toHaveText('E-mail ou senha incorretos.');
});
