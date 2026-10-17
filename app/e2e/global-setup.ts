import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { AUTH, db } from './db';

export const DEMO = { email: 'demo@exemplo.com.br', password: 'demo-local-123' };
export const STATE = 'e2e/.auth/demo.json';

// Banco limpo + seed antes de cada rodada; sessão do usuário demo salva para os specs.
export default async function globalSetup() {
  await db.unsafe('set client_min_messages = warning; truncate orgs, rate_limits cascade; delete from auth.users;');
  await fetch(`${AUTH}/__reset`);
  rmSync('.data', { recursive: true, force: true });
  execSync('node scripts/seed.mjs', { env: { ...process.env, SEED_EMAIL: DEMO.email, SEED_PASSWORD: DEMO.password }, stdio: 'ignore' });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: 'http://localhost:3000' });
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(DEMO.email);
  await page.getByLabel('Senha').fill(DEMO.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: STATE });
  await browser.close();
  await db.end();
}
