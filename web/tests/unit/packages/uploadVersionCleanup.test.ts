import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Auditoría 8 oct, P0-10: si la subida de un paquete falla a mitad (un
 * fichero o la RPC final), se borran de Storage los ficheros que ESA subida
 * llegó a escribir, para no dejar huérfanos.
 */

const upload = vi.fn()
const remove = vi.fn()
const rpc = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: { version: 2 }, error: null }),
            }),
          }),
        }),
      }),
    }),
    storage: { from: () => ({ upload, remove }) },
    rpc,
  })),
}))

import { supabaseHtmlPackageRepository } from '@/modules/packages/infrastructure/supabaseHtmlPackageRepository'

const INPUT = {
  contentId: 'content-1',
  entries: [
    { path: 'index.html', data: Buffer.from('<h1>x</h1>') },
    { path: 'assets/main.js', data: Buffer.from('1') },
  ],
  manifest: {
    kind: 'tool' as const,
    entrypoint: 'index.html',
    version: 1,
    requiredCapabilities: [],
    externalDomains: [],
    minViewport: { width: 320, height: 420 },
  },
  checksum: 'abc',
}

beforeEach(() => {
  vi.clearAllMocks()
  upload.mockResolvedValue({ error: null })
  remove.mockResolvedValue({ error: null })
  rpc.mockResolvedValue({ data: 'version-id', error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('supabaseHtmlPackageRepository.uploadVersion', () => {
  it('si todo va bien, no borra nada', async () => {
    await expect(
      supabaseHtmlPackageRepository.uploadVersion(INPUT),
    ).resolves.toBe('version-id')
    expect(remove).not.toHaveBeenCalled()
  })

  it('si la RPC falla, borra todos los ficheros ya subidos', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom', code: 'X' },
    })

    await expect(
      supabaseHtmlPackageRepository.uploadVersion(INPUT),
    ).rejects.toThrow('boom')
    expect(remove).toHaveBeenCalledWith([
      'content-1/v3/index.html',
      'content-1/v3/assets/main.js',
    ])
  })

  it('si falla un fichero a mitad, borra solo los que llegó a subir', async () => {
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'exists' } })

    await expect(
      supabaseHtmlPackageRepository.uploadVersion(INPUT),
    ).rejects.toThrow(/assets\/main.js/)
    expect(remove).toHaveBeenCalledWith(['content-1/v3/index.html'])
    expect(rpc).not.toHaveBeenCalled()
  })
})
