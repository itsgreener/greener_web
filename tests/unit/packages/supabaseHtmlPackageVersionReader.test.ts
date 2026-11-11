import { beforeEach, describe, expect, it, vi } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-4f2e-8d0c-b9a8f7e6d5c4'
const BASE = `${CONTENT_ID}/v3`

type Eq = { column: string; value: unknown }

const versionRow = vi.fn()
const contentRow = vi.fn()
const versionFilters: Eq[] = []
const list = vi.fn()
const download = vi.fn()

function builder(
  table: string,
  result: () => Promise<{ data: unknown; error: unknown }>,
  filters: Eq[],
) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value })
      return chain
    }),
    maybeSingle: vi.fn(() => result()),
    table,
  }

  return chain
}

const contentFilters: Eq[] = []

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) =>
      table === 'html_package_version'
        ? builder(table, versionRow, versionFilters)
        : builder(table, contentRow, contentFilters),
    storage: { from: () => ({ list, download }) },
  }),
}))

import { supabaseHtmlPackageVersionReader } from '@/modules/packages/infrastructure/supabaseHtmlPackageVersionReader'

const file = (name: string) => ({ name, id: `id-${name}` })
const folder = (name: string) => ({ name, id: null })
const blob = (text: string) => new Blob([text])

beforeEach(() => {
  vi.clearAllMocks()
  versionFilters.length = 0
  contentFilters.length = 0
  versionRow.mockResolvedValue({
    data: { version: 3, storage_path: BASE },
    error: null,
  })
  contentRow.mockResolvedValue({ data: { slug: 'pixel-palette' }, error: null })
  list.mockImplementation(async (prefix: string) =>
    prefix === BASE
      ? {
          data: [file('index.html'), file('manifest.json'), folder('assets')],
          error: null,
        }
      : { data: [file('main.js')], error: null },
  )
  download.mockImplementation(async (path: string) => ({
    data: blob(`contenido de ${path}`),
    error: null,
  }))
})

describe('supabaseHtmlPackageVersionReader.read', () => {
  it('busca la versión por su id Y por el contenido: una versión ajena no se lee', async () => {
    await supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID)

    expect(versionFilters).toEqual([
      { column: 'id', value: VERSION_ID },
      { column: 'package_id', value: CONTENT_ID },
    ])
  })

  it('devuelve slug, número de versión y los ficheros sin el prefijo de Storage', async () => {
    const result = await supabaseHtmlPackageVersionReader.read(
      CONTENT_ID,
      VERSION_ID,
    )

    expect(result?.slug).toBe('pixel-palette')
    expect(result?.version).toBe(3)
    expect(result?.files.map((entry) => entry.path).sort()).toEqual([
      'assets/main.js',
      'index.html',
      'manifest.json',
    ])
    expect(
      result?.files
        .find((entry) => entry.path === 'assets/main.js')
        ?.data.toString(),
    ).toBe(`contenido de ${BASE}/assets/main.js`)
  })

  it('la ruta de Storage sale de la base de datos, nunca del identificador', async () => {
    await supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID)

    expect(list).toHaveBeenCalledWith(BASE, expect.any(Object))
    expect(download).toHaveBeenCalledTimes(3)

    for (const [path] of download.mock.calls) {
      expect(path.startsWith(`${BASE}/`)).toBe(true)
    }
  })

  it('una versión que no es de ese contenido (o no existe) da null sin tocar Storage', async () => {
    versionRow.mockResolvedValue({ data: null, error: null })

    expect(
      await supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID),
    ).toBeNull()
    expect(list).not.toHaveBeenCalled()
    expect(download).not.toHaveBeenCalled()
  })

  it('un contenido que no existe da null', async () => {
    contentRow.mockResolvedValue({ data: null, error: null })

    expect(
      await supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID),
    ).toBeNull()
  })

  it('si la base de datos falla, lanza', async () => {
    versionRow.mockResolvedValue({
      data: null,
      error: { message: 'boom', code: 'XX000' },
    })

    await expect(
      supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID),
    ).rejects.toThrow('boom')
  })

  it('si un fichero no se puede leer, lanza en vez de entregar un paquete a medias', async () => {
    download.mockImplementation(async (path: string) =>
      path.endsWith('main.js')
        ? { data: null, error: { message: 'object not found' } }
        : { data: blob('ok'), error: null },
    )

    await expect(
      supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID),
    ).rejects.toThrow(/assets\/main\.js.*object not found/)
  })

  it('si Storage no lista, lanza', async () => {
    list.mockResolvedValue({ data: null, error: { message: 'sin listado' } })

    await expect(
      supabaseHtmlPackageVersionReader.read(CONTENT_ID, VERSION_ID),
    ).rejects.toThrow('sin listado')
  })

  it('descarga con concurrencia acotada (un paquete puede tener cientos de ficheros)', async () => {
    const names = Array.from({ length: 30 }, (_, index) => `f${index}.js`)

    list.mockImplementation(async (prefix: string) =>
      prefix === BASE
        ? { data: names.map(file), error: null }
        : { data: [], error: null },
    )

    let running = 0
    let peak = 0

    download.mockImplementation(async () => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise((resolve) => setTimeout(resolve, 1))
      running -= 1

      return { data: blob('x'), error: null }
    })

    const result = await supabaseHtmlPackageVersionReader.read(
      CONTENT_ID,
      VERSION_ID,
    )

    expect(result?.files).toHaveLength(30)
    expect(peak).toBeLessThanOrEqual(8)
    expect(peak).toBeGreaterThan(1)
  })
})
