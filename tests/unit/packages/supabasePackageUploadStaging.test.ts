import { beforeEach, describe, expect, it, vi } from 'vitest'

const createSignedUploadUrl = vi.fn()
const download = vi.fn()
const remove = vi.fn()
const from = vi.fn(() => ({ createSignedUploadUrl, download, remove }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ storage: { from } })),
}))

import { supabasePackageUploadStaging } from '@/modules/packages/infrastructure/supabasePackageUploadStaging'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('createUploadTarget', () => {
  it('firma una subida bajo _incoming/<contenido>/ en el bucket de paquetes', async () => {
    createSignedUploadUrl.mockResolvedValue({
      data: { token: 'tok', path: 'x', signedUrl: 'u' },
      error: null,
    })

    const target =
      await supabasePackageUploadStaging.createUploadTarget(CONTENT_ID)

    expect(from).toHaveBeenCalledWith('html-packages')
    expect(target.bucket).toBe('html-packages')
    expect(target.token).toBe('tok')
    expect(target.path).toMatch(
      new RegExp(`^_incoming/${CONTENT_ID}/[0-9a-f-]{36}\\.zip$`),
    )
    expect(createSignedUploadUrl).toHaveBeenCalledWith(target.path)
  })

  it('cada subida tiene su propia ruta', async () => {
    createSignedUploadUrl.mockResolvedValue({
      data: { token: 't' },
      error: null,
    })

    const a = await supabasePackageUploadStaging.createUploadTarget(CONTENT_ID)
    const b = await supabasePackageUploadStaging.createUploadTarget(CONTENT_ID)

    expect(a.path).not.toBe(b.path)
  })

  it('si Storage falla, lanza un error', async () => {
    createSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'denegado' },
    })

    await expect(
      supabasePackageUploadStaging.createUploadTarget(CONTENT_ID),
    ).rejects.toThrow(/preparar la subida/)
  })
})

describe('read', () => {
  it('devuelve los bytes del fichero', async () => {
    download.mockResolvedValue({
      data: new Blob([new Uint8Array([1, 2, 3])]),
      error: null,
    })

    const zip = await supabasePackageUploadStaging.read('_incoming/a/b.zip')

    expect([...zip]).toEqual([1, 2, 3])
    expect(download).toHaveBeenCalledWith('_incoming/a/b.zip')
  })

  it('si no se puede leer, lanza un error', async () => {
    download.mockResolvedValue({ data: null, error: { message: 'no existe' } })

    await expect(supabasePackageUploadStaging.read('x')).rejects.toThrow(
      /leer la subida/,
    )
  })
})

describe('discard', () => {
  it('borra la subida', async () => {
    remove.mockResolvedValue({ error: null })

    await supabasePackageUploadStaging.discard('_incoming/a/b.zip')

    expect(remove).toHaveBeenCalledWith(['_incoming/a/b.zip'])
  })

  it('si el borrado falla o lanza, no se propaga (solo queda un fichero suelto)', async () => {
    remove.mockResolvedValueOnce({ error: { message: 'x' } })
    await expect(
      supabasePackageUploadStaging.discard('a'),
    ).resolves.toBeUndefined()

    remove.mockRejectedValueOnce(new Error('red'))
    await expect(
      supabasePackageUploadStaging.discard('a'),
    ).resolves.toBeUndefined()
  })
})
