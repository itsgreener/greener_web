import { expect, test as base, type Page } from '@playwright/test'

/** PNG de 1×1 píxel: sustituye a las imágenes de Cloudinary (que no existen). */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

/**
 * Los datos de demo apuntan a identificadores de Cloudinary que no existen y
 * los E2E no salen a internet: toda petición a `res.cloudinary.com` recibe un
 * PNG mínimo y se cuenta aparte.
 */
export async function stubCloudinary(page: Page) {
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  )
}

/**
 * `<SpeedInsights />` (src/app/layout.tsx) pide `/_vercel/speed-insights/
 * script.js` al propio origen. Ese endpoint lo sirve la plataforma de Vercel,
 * no la aplicación: contra el servidor standalone del CI da 404 y el navegador
 * registra dos errores de consola («Failed to load resource» y «Refused to
 * execute script… MIME type»), que hacen fallar toda aserción de «sin errores
 * de consola» (E1, E5, E6 y E7). Todo lo que cuelga de `/_vercel/` es de la
 * plataforma, así que se responde un script vacío (200, JavaScript): el
 * componente carga «su» script y no se envía nada a ninguna parte.
 */
export async function stubVercelPlatform(page: Page) {
  await page.route('**/_vercel/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: '',
    }),
  )
}

/** Todo lo que la web pide fuera de sí misma o a la plataforma que la aloja. */
export async function stubExternalRequests(page: Page) {
  await stubCloudinary(page)
  await stubVercelPlatform(page)
}

export type ConsoleProblems = string[]

export const test = base.extend<{ consoleProblems: ConsoleProblems }>({
  page: async ({ page }, run) => {
    await stubExternalRequests(page)
    await run(page)
  },
  // (El segundo argumento no se llama `use`: ESLint lo confundiría con el hook
  // de React.) Errores de consola y excepciones no capturadas de la página, para que cada
  // test pueda afirmar que no hubo ninguno.
  consoleProblems: async ({ page }, run) => {
    const problems: ConsoleProblems = []

    page.on('console', (message) => {
      if (message.type() === 'error')
        problems.push(`console: ${message.text()}`)
    })
    page.on('pageerror', (error) =>
      problems.push(`pageerror: ${error.message}`),
    )

    await run(problems)
  },
})

export { expect }
