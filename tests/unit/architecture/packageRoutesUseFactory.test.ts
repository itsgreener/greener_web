import { describe, expect, it } from 'vitest'

import { codeOf, sourceFiles } from '@tests/helpers/sourceFiles'

/**
 * Toda `route.ts` bajo `…/[slug]/app` (documento y assets de un paquete HTML)
 * debe salir de las fábricas de `_lib/packageRoutes` (auditoría TSX, PUB-C1).
 * `tests/unit/packages/packageRoutes.test.ts` fija las seis de hoy; este test
 * descubre las que se añadan, para que una séptima no vuelva a llevar su
 * propia copia de la CSP.
 */
const ROUTE = /\/\[slug\]\/app\/(assets\/\[\.\.\.file\]\/)?route\.ts$/

describe('rutas de paquetes', () => {
  const routes = sourceFiles('src/app').filter((file) => ROUTE.test(file))

  it('hoy son seis: documento y assets de tools, insights y variety', () => {
    expect(routes).toHaveLength(6)
  })

  it.each(routes)('%s delega en la fábrica', (file) => {
    const code = codeOf(file)

    expect(code).toContain('_lib/packageRoutes')
    expect(code).toMatch(
      /export const GET = createPackage(Document|Asset)Route\(/,
    )
    expect(code).not.toContain('Content-Security-Policy')
  })
})
