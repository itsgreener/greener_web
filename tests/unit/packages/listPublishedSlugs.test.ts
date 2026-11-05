import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `listPublishedSlugs`: los slugs de contenidos publicados con una versión
 * publicada del paquete, de una sola consulta. Lo usa la URL corta de las
 * páginas satélite (`/{slug}`).
 */

let result: { data: unknown; error: { message: string } | null }
const eqSpy = vi.fn()

function chain() {
  const builder = {
    select: () => builder,
    eq: (...args: unknown[]) => {
      eqSpy(...args)
      return builder
    },
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }

  return builder
}

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

vi.mock('@/lib/supabase/publicReadClient', () => ({
  createPublicReadClient: () => ({ from: () => chain() }),
}))

vi.mock('@/lib/supabase/serviceClient', () => ({
  createServiceClient: () => ({}),
}))

function row(slug: string, status: string | null, asArray = false) {
  const html_package = status === null ? null : { current_version: { status } }

  return { slug, html_package: asArray ? [html_package] : html_package }
}

beforeEach(() => {
  vi.clearAllMocks()
  result = { data: [], error: null }
})

async function load() {
  const { supabasePublishedPackageSource } =
    await import('@/modules/packages/infrastructure/supabaseStorageSource')

  return supabasePublishedPackageSource
}

describe('listPublishedSlugs', () => {
  it('devuelve solo los contenidos con versión publicada', async () => {
    result = {
      data: [
        row('talent', 'published'),
        row('sin-paquete', null),
        row('borrador', 'draft'),
        row('otra', 'published', true),
      ],
      error: null,
    }

    const source = await load()

    await expect(source.listPublishedSlugs('variety')).resolves.toEqual([
      'talent',
      'otra',
    ])
  })

  it('busca entre los contenidos publicados del tipo del paquete (variety → other)', async () => {
    const source = await load()

    await source.listPublishedSlugs('variety')

    expect(eqSpy).toHaveBeenCalledWith('type', 'other')
    expect(eqSpy).toHaveBeenCalledWith('status', 'published')
  })

  it('sin filas devuelve una lista vacía', async () => {
    result = { data: null, error: null }

    const source = await load()

    await expect(source.listPublishedSlugs('variety')).resolves.toEqual([])
  })

  it('un fallo de Supabase es PackageSourceUnavailableError (503), no una lista vacía', async () => {
    result = { data: null, error: { message: 'caído' } }

    const source = await load()
    const { PackageSourceUnavailableError } =
      await import('@/modules/packages/domain/manifest')

    await expect(source.listPublishedSlugs('variety')).rejects.toBeInstanceOf(
      PackageSourceUnavailableError,
    )
  })
})
