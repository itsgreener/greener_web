import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `/{slug}` → `/variety/{slug}/app` solo para páginas satélite publicadas.
 */

const listPublishedSlugs = vi.fn()
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`)
})
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
  notFound: () => notFound(),
}))

vi.mock('@/modules/packages/container', () => ({
  publishedPackages: {
    listPublishedSlugs: (...args: unknown[]) => listPublishedSlugs(...args),
  },
}))

async function render(slug: string) {
  const { default: Page } = await import('@/app/(public)/[slug]/page')

  return Page({ params: Promise.resolve({ slug }) })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('URL corta de una página satélite', () => {
  it('redirige a /variety/{slug}/app si la página está publicada', async () => {
    listPublishedSlugs.mockResolvedValue(['talent', 'otra'])

    await expect(render('talent')).rejects.toThrow(
      'NEXT_REDIRECT:/variety/talent/app',
    )
    expect(listPublishedSlugs).toHaveBeenCalledWith('variety')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('da 404 si el slug no es de una página publicada', async () => {
    listPublishedSlugs.mockResolvedValue(['talent'])

    await expect(render('no-existe')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(redirect).not.toHaveBeenCalled()
  })

  it('da 404 si no hay ninguna página publicada', async () => {
    listPublishedSlugs.mockResolvedValue([])

    await expect(render('talent')).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('no inventa una redirección si la lectura falla: deja subir el error', async () => {
    listPublishedSlugs.mockRejectedValue(new Error('supabase caído'))

    await expect(render('talent')).rejects.toThrow('supabase caído')
    expect(redirect).not.toHaveBeenCalled()
    expect(notFound).not.toHaveBeenCalled()
  })
})
