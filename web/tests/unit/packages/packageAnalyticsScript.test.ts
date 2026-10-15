// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `public/greener-package-analytics.js` es el único código de Greener que
 * corre DENTRO del documento de un paquete. Se ejecuta aquí tal cual, como
 * lo haría el navegador, con `document.currentScript` apuntando a la etiqueta
 * que inyecta composeToolDocument.
 */

const SOURCE = readFileSync(
  join(process.cwd(), 'public/greener-package-analytics.js'),
  'utf-8',
)

const fetchMock = vi
  .fn<typeof fetch>()
  .mockImplementation(() => Promise.resolve(new Response(null)))

function run(attributes: Record<string, string>) {
  const script = document.createElement('script')

  for (const [name, value] of Object.entries(attributes)) {
    script.setAttribute(name, value)
  }

  Object.defineProperty(document, 'currentScript', {
    configurable: true,
    value: script,
  })

  new Function(SOURCE)()
}

function bodies(): unknown[] {
  return fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
}

describe('greener-package-analytics.js', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
    delete (window as { GreenerAnalytics?: unknown }).GreenerAnalytics
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('en un insight registra la apertura UNA vez, al cargar, sin esperar a nada', () => {
    run({ 'data-greener-kind': 'insight', 'data-greener-slug': 'informe' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/package',
      expect.objectContaining({ method: 'POST', credentials: 'omit' }),
    )
    expect(bodies()).toEqual([{ kind: 'insight', slug: 'informe' }])
  })

  it('en un insight no expone toolUsed ni escucha greener:tool-used', () => {
    run({ 'data-greener-kind': 'insight', 'data-greener-slug': 'informe' })
    fetchMock.mockClear()

    window.dispatchEvent(
      new CustomEvent('greener:tool-used', { detail: { action: 'x' } }),
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect((window as { GreenerAnalytics?: unknown }).GreenerAnalytics).toBe(
      undefined,
    )
  })

  it('en una tool NO envía nada al cargar; sí al disparar greener:tool-used', () => {
    run({ 'data-greener-kind': 'tool', 'data-greener-slug': 'paleta' })

    expect(fetchMock).not.toHaveBeenCalled()

    window.dispatchEvent(
      new CustomEvent('greener:tool-used', { detail: { action: 'export' } }),
    )

    expect(bodies()).toEqual([
      { kind: 'tool', slug: 'paleta', action: 'export' },
    ])
  })

  it('en una tool, toolUsed ignora acciones con formato inválido', () => {
    run({ 'data-greener-kind': 'tool', 'data-greener-slug': 'paleta' })

    const api = (
      window as { GreenerAnalytics?: { toolUsed(action: string): void } }
    ).GreenerAnalytics!

    api.toolUsed('con espacios')
    api.toolUsed('')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sin slug o con un kind desconocido no hace nada', () => {
    run({ 'data-greener-kind': 'insight' })
    run({ 'data-greener-kind': 'case', 'data-greener-slug': 'x' })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
