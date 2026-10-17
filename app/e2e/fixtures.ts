import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { resetRateLimits } from './db';
import { STATE } from './global-setup';

export { expect };

type Guards = { consoleErrors: string[]; serverErrors: string[] };

/**
 * Toda página: falha com erro de console ou resposta 5xx.
 * Testes que esperam 404 de propósito usam `allow404` (o navegador registra o 404 como erro de recurso).
 */
export const test = base.extend<{ guards: Guards; allow404: boolean; axe: (page?: Page) => Promise<void> }>({
  allow404: [false, { option: true }],
  storageState: STATE,
  guards: [async ({ page, allow404 }, use) => {
    await resetRateLimits();
    const g: Guards = { consoleErrors: [], serverErrors: [] };
    const watch = (p: Page) => {
      p.on('console', (m) => {
        if (m.type() !== 'error') return;
        if (allow404 && /status of 404/.test(m.text())) return;
        g.consoleErrors.push(m.text().slice(0, 300));
      });
      p.on('pageerror', (e) => g.consoleErrors.push(`pageerror: ${e.message}`));
      p.on('response', (r) => { if (r.status() >= 500) g.serverErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
    };
    watch(page);
    page.context().on('page', watch);
    await use(g);
    expect(g.serverErrors, 'respostas 5xx').toEqual([]);
    expect(g.consoleErrors, 'erros de console').toEqual([]);
  }, { auto: true }],
  axe: async ({ page }, use) => {
    await use(async (p = page) => {
      const r = await new AxeBuilder({ page: p as never }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`), `axe em ${p.url()}`).toEqual([]);
    });
  },
});

/** Contexto anônimo (sem a sessão do demo). */
export const anon = { storageState: { cookies: [], origins: [] } };
