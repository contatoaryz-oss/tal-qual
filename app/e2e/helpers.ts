import { expect, type Page } from '@playwright/test';
import { lastLink } from './db';

export const PW = 'senha-de-teste-1';

export async function signUpAndConfirm(page: Page, email: string, pw = PW) {
  await page.goto('/criar-conta');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(pw);
  await page.getByLabel('Repita a senha').fill(pw);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page.getByRole('heading', { name: 'Falta confirmar o e-mail' })).toBeVisible();
  await page.goto(await lastLink(email, 'signup'));
  await page.waitForURL((u) => u.pathname === '/');
}

