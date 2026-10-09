// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'

/**
 * /preview/masonry NUNCA debe renderizarse en producción (PROGRESO §4.8):
 * consume /api/feed/demo, que también está bloqueada allí.
 */

const notFound = vi.fn(() => {
  // Igual que el notFound() real de Next: interrumpe el render lanzando.
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/navigation', () => ({ notFound }))
vi.mock('@/components/masonry/MasonryFeed', () => ({
  MasonryFeed: () => null,
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.clearAllMocks()
})

describe('MasonryPreviewPage — bloqueada en producción', () => {
  it('en producción llama a notFound() y no pinta el prototipo', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const MasonryPreviewPage = (
      await import('@/app/(public)/preview/masonry/page')
    ).default

    expect(() => render(<MasonryPreviewPage />)).toThrow('NEXT_NOT_FOUND')
    // React puede reintentar el render de un componente que lanza (StrictMode
    // interno de desarrollo) — lo que importa es que se llamó, no cuántas veces.
    expect(notFound).toHaveBeenCalled()
  })

  it('fuera de producción se sigue renderizando con normalidad', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const MasonryPreviewPage = (
      await import('@/app/(public)/preview/masonry/page')
    ).default

    const { container } = render(<MasonryPreviewPage />)

    expect(notFound).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Prototipo de Fase 1')
  })
})
