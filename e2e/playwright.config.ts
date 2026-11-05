import { defineConfig, devices } from '@playwright/test'
import { resolve } from 'node:path'

/**
 * E2E de la web (docs/operaciones/e2e.md). Sirven la compilación de
 * producción contra el Supabase local del CI; las variables las pone
 * `scripts/e2e-env.mjs`. Se lanzan con:
 *
 *   npx playwright test -c e2e/playwright.config.ts
 */
const root = resolve(__dirname, '..')
const PORT = 3000

export default defineConfig({
  testDir: resolve(__dirname, 'specs'),
  outputDir: resolve(root, 'test-results'),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Un reintento en el CI: los de scroll y vídeo son propensos a falsos fallos.
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI
    ? [
        ['list'],
        [
          'html',
          { open: 'never', outputFolder: resolve(root, 'playwright-report') },
        ],
      ]
    : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Primera visita real: sin cookies guardadas, y en inglés como la web.
    locale: 'en',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-serve.mjs',
    cwd: root,
    // /api/health responde 200 solo si la web llega a Supabase.
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
