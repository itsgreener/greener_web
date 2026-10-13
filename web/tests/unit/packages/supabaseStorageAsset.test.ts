import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * supabasePublishedPackageSource.getAsset contra un Supabase simulado. Lo que importa aquí:
 * (1) el ETag sale del checksum de la versión PUBLICADA, (2) con
 * If-None-Match coincidente NO se descarga nada de Storage, (3) al cambiar
 * la versión publicada (nueva o rollback) el ETag cambia.
 */

// Respuesta de la ÚNICA consulta de versión publicada (content -> paquete ->
// versión actual) y fallo simulado de Supabase.
let published: Record<string, unknown> | null
let queryError: { message: string } | null
const download = vi.fn()
const selectSpy = vi.fn()

function chain() {
  const builder = {
    select: (...args: unknown[]) => {
      selectSpy(...args)
      return builder
    },
    eq: () => builder,
    maybeSingle: async () => ({ data: published, error: queryError }),
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
  createServiceClient: () => ({
    storage: { from: () => ({ download }) },
  }),
}))

function publish(checksum: string, storagePath = 'tools/mi-tool/v1') {
  published = {
    html_package: {
      current_version: {
        storage_path: storagePath,
        status: 'published',
        checksum,
      },
    },
  }
}

function fileWith(text: string) {
  return {
    data: { arrayBuffer: async () => new TextEncoder().encode(text).buffer },
    error: null,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  queryError = null
  publish('checksum-v1')
})

describe('getAsset — caché por ETag', () => {
  it('devuelve los bytes y el ETag de la versión publicada la primera vez', async () => {
    download.mockResolvedValue(fileWith('console.log(1)'))

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    const asset = await supabasePublishedPackageSource.getAsset(
      'tool',
      'mi-tool',
      ['main.js'],
    )

    expect(asset.etag).toBe('"checksum-v1"')
    expect(asset.notModified).toBe(false)
    expect(
      asset.notModified ? '' : Buffer.from(asset.data).toString('utf-8'),
    ).toBe('console.log(1)')
    expect(download).toHaveBeenCalledWith('tools/mi-tool/v1/main.js')
  })

  it('con If-None-Match coincidente responde notModified SIN descargar de Storage', async () => {
    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    const asset = await supabasePublishedPackageSource.getAsset(
      'tool',
      'mi-tool',
      ['main.js'],
      '"checksum-v1"',
    )

    expect(asset).toEqual({ notModified: true, etag: '"checksum-v1"' })
    expect(download).not.toHaveBeenCalled()
  })

  it('al publicar una versión nueva el ETag viejo ya no vale y llega el asset nuevo', async () => {
    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    const etagV1 = '"checksum-v1"'

    publish('checksum-v2', 'tools/mi-tool/v2')
    download.mockResolvedValue(fileWith('console.log(2)'))

    const asset = await supabasePublishedPackageSource.getAsset(
      'tool',
      'mi-tool',
      ['main.js'],
      etagV1,
    )

    expect(asset.notModified).toBe(false)
    expect(asset.etag).toBe('"checksum-v2"')
    expect(download).toHaveBeenCalledWith('tools/mi-tool/v2/main.js')
  })

  it('un rollback a una versión anterior también invalida la caché (vuelve el ETag antiguo)', async () => {
    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    // El navegador tenía cacheada la v2; el admin hace rollback a la v1.
    publish('checksum-v1', 'tools/mi-tool/v1')
    download.mockResolvedValue(fileWith('console.log(1)'))

    const asset = await supabasePublishedPackageSource.getAsset(
      'tool',
      'mi-tool',
      ['main.js'],
      '"checksum-v2"',
    )

    expect(asset.notModified).toBe(false)
    expect(asset.etag).toBe('"checksum-v1"')
  })

  it('sigue rechazando rutas con ".." antes de tocar Storage', async () => {
    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      supabasePublishedPackageSource.getAsset('tool', 'mi-tool', [
        '..',
        'secreto.txt',
      ]),
    ).rejects.toBeInstanceOf(PackageNotFoundError)
    expect(download).not.toHaveBeenCalled()
  })

  it('sigue dando PackageNotFoundError si el contenido no está publicado', async () => {
    published = null

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      supabasePublishedPackageSource.getAsset('tool', 'mi-tool', ['main.js']),
    ).rejects.toBeInstanceOf(PackageNotFoundError)
  })

  it('la versión publicada se resuelve con UNA sola consulta, no tres en serie', async () => {
    download.mockResolvedValue(fileWith('x'))

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    await supabasePublishedPackageSource.getAsset('tool', 'mi-tool', ['a.js'])

    expect(selectSpy).toHaveBeenCalledTimes(1)
  })

  it('una versión que no está publicada (rollback, borrador) es NotFound', async () => {
    published = {
      html_package: {
        current_version: {
          storage_path: 'x',
          status: 'rolled_back',
          checksum: 'c',
        },
      },
    }

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      supabasePublishedPackageSource.getAsset('tool', 'mi-tool', ['a.js']),
    ).rejects.toBeInstanceOf(PackageNotFoundError)
  })
})

describe('getAsset — un corte de Supabase no se disfraza de 404', () => {
  it('si la consulta de versión falla, lanza PackageSourceUnavailableError', async () => {
    published = null
    queryError = { message: 'connection reset' }

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageSourceUnavailableError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      supabasePublishedPackageSource.getAsset('tool', 'mi-tool', ['a.js']),
    ).rejects.toBeInstanceOf(PackageSourceUnavailableError)
  })

  it('si Storage falla de forma genérica, lanza PackageSourceUnavailableError', async () => {
    download.mockResolvedValue({ data: null, error: new Error('timeout') })

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageSourceUnavailableError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      supabasePublishedPackageSource.getAsset('tool', 'mi-tool', ['a.js']),
    ).rejects.toBeInstanceOf(PackageSourceUnavailableError)
  })

  it('si Storage dice que el objeto no existe (404), es PackageNotFoundError', async () => {
    const { StorageApiError } = await import('@supabase/supabase-js')
    download.mockResolvedValue({
      data: null,
      error: new StorageApiError('Object not found', 400, '404'),
    })

    const { supabasePublishedPackageSource } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      supabasePublishedPackageSource.getAsset('tool', 'mi-tool', ['a.js']),
    ).rejects.toBeInstanceOf(PackageNotFoundError)
  })
})
