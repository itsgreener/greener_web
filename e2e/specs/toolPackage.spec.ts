import {
  installToolFixture,
  removeToolFixture,
  TOOL_FIXTURE,
} from '../support/toolPackage'
import { expect, test } from '../support/test'

const APP = `/tools/${TOOL_FIXTURE.slug}/app`

// E8 — paquete de tool (plan de mejoras §9.3).
test.describe('Paquete de tool', () => {
  test.beforeAll(installToolFixture)
  test.afterAll(removeToolFixture)

  test('E8: el documento se sirve con su CSP y un .svg del paquete lleva la CSP sandbox', async ({
    page,
    request,
    consoleProblems,
  }) => {
    // El documento de la tool.
    const document = await request.get(APP)
    expect(document.status()).toBe(200)
    expect(document.headers()['content-type']).toContain('text/html')
    expect(document.headers()['x-content-type-options']).toBe('nosniff')
    const csp = document.headers()['content-security-policy'] ?? ''
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ]) {
      expect(csp, `falta «${directive}» en la CSP del documento`).toContain(
        directive,
      )
    }
    // La tool se sirve en el mismo origen, con las rutas de sus assets
    // resueltas contra su propia carpeta.
    expect(await document.text()).toContain(`<base href="${APP}/"`)

    // Un .svg: si alguien lo abre por su URL, no puede ejecutar nada.
    const svg = await request.get(`${APP}/assets/logo.svg`)
    expect(svg.status()).toBe(200)
    expect(svg.headers()['content-type']).toContain('image/svg+xml')
    expect(svg.headers()['content-security-policy']).toBe(
      "default-src 'none'; sandbox",
    )

    // Un .js no lleva la CSP de documento inactivo.
    const script = await request.get(`${APP}/assets/app.js`)
    expect(script.status()).toBe(200)
    expect(script.headers()['content-type']).toContain('javascript')
    expect(script.headers()['content-security-policy']).toBeUndefined()

    // Revalidación con ETag: la misma versión no se vuelve a descargar.
    const etag = svg.headers().etag
    expect(etag).toBeTruthy()
    const cached = await request.get(`${APP}/assets/logo.svg`, {
      headers: { 'If-None-Match': etag },
    })
    expect(cached.status()).toBe(304)

    // Una tool que no existe: 404, también con las cabeceras de seguridad.
    const missing = await request.get('/tools/no-such-tool/app')
    expect(missing.status()).toBe(404)
    expect(missing.headers()['x-content-type-options']).toBe('nosniff')

    // En el navegador: la CSP deja correr su script y no salta ninguna
    // violación en consola.
    await page.goto(APP)
    await expect(
      page.getByRole('heading', { name: 'E2E tool fixture' }),
    ).toBeVisible()
    await expect(page.locator('body')).toHaveAttribute('data-ready', '1')
    expect(consoleProblems).toEqual([])
  })
})
