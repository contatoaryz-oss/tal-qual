import { defineConfig, devices } from '@playwright/test';

// Testes de ponta a ponta contra o dev server local (Postgres + simulador de auth: npm run local:up).
// Um worker só: os testes dividem o mesmo banco e os jobs rodam no processo do Next.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'npm run dev', url: 'http://localhost:3000/entrar', reuseExistingServer: true, timeout: 120_000 },
});
