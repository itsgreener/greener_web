import { beforeEach, describe, expect, it, vi } from 'vitest'

const CONTENT_A = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const CONTENT_B = '9d8c7b6a-5f4e-4d3c-8b2a-1f0e9d8c7b6a'
const UPLOAD_1 = '4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const UPLOAD_2 = '0a1b2c3d-4e5f-4a7b-8c9d-0e1f2a3b4c5e'

const storage = vi.hoisted(() => ({
  listing: {} as Record<string, unknown[]>,
  list: vi.fn(),
  remove: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/serviceClient', () => ({
  createServiceClient: () => ({ storage: { from: storage.from } }),
}))

import { supabaseStagedUploadSweeper } from '@/modules/packages/infrastructure/supabaseStagedUploadSweeper'

beforeEach(() => {
  storage.listing = {
    _incoming: [
      { name: CONTENT_A },
      { name: CONTENT_B },
      { name: 'otra-cosa' },
    ],
    [`_incoming/${CONTENT_A}`]: [
      { name: `${UPLOAD_1}.zip`, created_at: '2026-10-20T10:00:00.000Z' },
      {
        name: '.emptyFolderPlaceholder',
        created_at: '2026-10-01T00:00:00.000Z',
      },
    ],
    [`_incoming/${CONTENT_B}`]: [{ name: `${UPLOAD_2}.zip`, created_at: null }],
  }
  storage.list.mockReset()
  storage.list.mockImplementation(async (prefix: string) => ({
    data: storage.listing[prefix] ?? [],
    error: null,
  }))
  storage.remove.mockReset()
  storage.remove.mockImplementation(async (paths: string[]) => ({
    data: paths.map((name) => ({ name })),
    error: null,
  }))
  storage.from.mockReset()
  storage.from.mockReturnValue({ list: storage.list, remove: storage.remove })
})

describe('supabaseStagedUploadSweeper.listStaged', () => {
  it('lista las subidas de cada contenido con su fecha', async () => {
    const { files, truncated } =
      await supabaseStagedUploadSweeper.listStaged(10)

    expect(storage.from).toHaveBeenCalledWith('html-packages')
    expect(truncated).toBe(false)
    expect(files).toEqual([
      {
        path: `_incoming/${CONTENT_A}/${UPLOAD_1}.zip`,
        createdAt: Date.parse('2026-10-20T10:00:00.000Z'),
      },
      { path: `_incoming/${CONTENT_B}/${UPLOAD_2}.zip`, createdAt: null },
    ])
  })

  it('ignora lo que no tiene forma de contenido ni de subida (placeholder, nombres raros)', async () => {
    const { files } = await supabaseStagedUploadSweeper.listStaged(10)

    expect(files.some((f) => f.path.includes('emptyFolderPlaceholder'))).toBe(
      false,
    )
    expect(storage.list).not.toHaveBeenCalledWith(
      '_incoming/otra-cosa',
      expect.anything(),
    )
  })

  it('respeta el máximo de contenidos y avisa de que hay más', async () => {
    const { files, truncated } = await supabaseStagedUploadSweeper.listStaged(1)

    expect(truncated).toBe(true)
    expect(files.map((f) => f.path)).toEqual([
      `_incoming/${CONTENT_A}/${UPLOAD_1}.zip`,
    ])
  })

  it('pagina el listado de contenidos', async () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      name: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    }))
    const tail = [{ name: CONTENT_A }]

    storage.list.mockImplementation(
      async (prefix: string, options?: { offset?: number }) => {
        if (prefix === '_incoming') {
          return { data: options?.offset ? tail : many, error: null }
        }

        return { data: [], error: null }
      },
    )

    await supabaseStagedUploadSweeper.listStaged(500)

    expect(storage.list).toHaveBeenCalledWith(
      '_incoming',
      expect.objectContaining({ offset: 100 }),
    )
    expect(storage.list).toHaveBeenCalledWith(
      `_incoming/${CONTENT_A}`,
      expect.anything(),
    )
  })

  it('un error de Storage al listar sube como excepción', async () => {
    storage.list.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    })

    await expect(supabaseStagedUploadSweeper.listStaged(10)).rejects.toThrow(
      /No se pudo listar _incoming: boom/,
    )
  })
})

describe('supabaseStagedUploadSweeper.remove', () => {
  it('borra solo rutas con forma de subida preparada', async () => {
    const good = `_incoming/${CONTENT_A}/${UPLOAD_1}.zip`

    const count = await supabaseStagedUploadSweeper.remove([
      good,
      `${CONTENT_A}/v1/index.html`,
      '_incoming/../etc/passwd',
    ])

    expect(storage.remove).toHaveBeenCalledWith([good])
    expect(count).toBe(1)
  })

  it('sin rutas válidas no llama a Storage', async () => {
    expect(
      await supabaseStagedUploadSweeper.remove([`${CONTENT_A}/v1/index.html`]),
    ).toBe(0)
    expect(storage.remove).not.toHaveBeenCalled()
  })

  it('un error de Storage al borrar sube como excepción', async () => {
    storage.remove.mockResolvedValueOnce({
      data: null,
      error: { message: 'no' },
    })

    await expect(
      supabaseStagedUploadSweeper.remove([
        `_incoming/${CONTENT_A}/${UPLOAD_1}.zip`,
      ]),
    ).rejects.toThrow(/No se pudo borrar de _incoming: no/)
  })
})
