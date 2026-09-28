import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * getStoragePackageAsset contra un Supabase simulado. Lo que importa aquí:
 * (1) el ETag sale del checksum de la versión PUBLICADA, (2) con
 * If-None-Match coincidente NO se descarga nada de Storage, (3) al cambiar
 * la versión publicada (nueva o rollback) el ETag cambia.
 */

type Row = Record<string, unknown> | null

let tables: Record<string, Row>
const download = vi.fn()

function chain(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({ data: tables[table] ?? null }),
  }
  return builder
}

vi.mock('@/lib/supabase/publicReadClient', () => ({
  createPublicReadClient: () => ({ from: (table: string) => chain(table) }),
}))

vi.mock('@/lib/supabase/serviceClient', () => ({
  createServiceClient: () => ({
    storage: { from: () => ({ download }) },
  }),
}))

function publish(checksum: string, storagePath = 'tools/mi-tool/v1') {
  tables = {
    content: { id: 'content-1' },
    html_package: { current_version_id: 'version-1' },
    html_package_version: {
      storage_path: storagePath,
      status: 'published',
      checksum,
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
  publish('checksum-v1')
})

describe('getStoragePackageAsset — caché por ETag', () => {
  it('devuelve los bytes y el ETag de la versión publicada la primera vez', async () => {
    download.mockResolvedValue(fileWith('console.log(1)'))

    const { getStoragePackageAsset } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    const asset = await getStoragePackageAsset('tool', 'mi-tool', ['main.js'])

    expect(asset.etag).toBe('"checksum-v1"')
    expect(asset.notModified).toBe(false)
    expect(
      asset.notModified ? '' : Buffer.from(asset.data).toString('utf-8'),
    ).toBe('console.log(1)')
    expect(download).toHaveBeenCalledWith('tools/mi-tool/v1/main.js')
  })

  it('con If-None-Match coincidente responde notModified SIN descargar de Storage', async () => {
    const { getStoragePackageAsset } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    const asset = await getStoragePackageAsset(
      'tool',
      'mi-tool',
      ['main.js'],
      '"checksum-v1"',
    )

    expect(asset).toEqual({ notModified: true, etag: '"checksum-v1"' })
    expect(download).not.toHaveBeenCalled()
  })

  it('al publicar una versión nueva el ETag viejo ya no vale y llega el asset nuevo', async () => {
    const { getStoragePackageAsset } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    const etagV1 = '"checksum-v1"'

    publish('checksum-v2', 'tools/mi-tool/v2')
    download.mockResolvedValue(fileWith('console.log(2)'))

    const asset = await getStoragePackageAsset(
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
    const { getStoragePackageAsset } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')

    // El navegador tenía cacheada la v2; el admin hace rollback a la v1.
    publish('checksum-v1', 'tools/mi-tool/v1')
    download.mockResolvedValue(fileWith('console.log(1)'))

    const asset = await getStoragePackageAsset(
      'tool',
      'mi-tool',
      ['main.js'],
      '"checksum-v2"',
    )

    expect(asset.notModified).toBe(false)
    expect(asset.etag).toBe('"checksum-v1"')
  })

  it('sigue rechazando rutas con ".." antes de tocar Storage', async () => {
    const { getStoragePackageAsset } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      getStoragePackageAsset('tool', 'mi-tool', ['..', 'secreto.txt']),
    ).rejects.toBeInstanceOf(PackageNotFoundError)
    expect(download).not.toHaveBeenCalled()
  })

  it('sigue dando PackageNotFoundError si el contenido no está publicado', async () => {
    tables = { content: null }

    const { getStoragePackageAsset } =
      await import('@/modules/packages/infrastructure/supabaseStorageSource')
    const { PackageNotFoundError } =
      await import('@/modules/packages/domain/manifest')

    await expect(
      getStoragePackageAsset('tool', 'mi-tool', ['main.js']),
    ).rejects.toBeInstanceOf(PackageNotFoundError)
  })
})
