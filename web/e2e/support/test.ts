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
async function stubCloudinary(page: Page) {
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
  )
}

export type ConsoleProblems = string[]

export const test = base.extend<{ consoleProblems: ConsoleProblems }>({
  page: async ({ page }, run) => {
    await stubCloudinary(page)
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
