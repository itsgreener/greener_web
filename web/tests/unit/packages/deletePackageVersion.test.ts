import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-4f2e-8d0c-b9a8f7e6d5c4'

const rpc = vi.fn()
const list = vi.fn()
const remove = vi.fn()
const from = vi.fn(() => ({ list, remove }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ rpc, storage: { from } }),
}))

import { supabaseHtmlPackageRepository } from '@/modules/packages/infrastructure/supabaseHtmlPackageRepository'

const file = (name: string) => ({ name, id: `id-${name}` })
const folder = (name: string) => ({ name, id: null })

beforeEach(() => {
  vi.clearAllMocks()
  rpc.mockResolvedValue({ data: `${CONTENT_ID}/v1`, error: null })
  remove.mockResolvedValue({ error: null })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('migración delete_html_package_version', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase',
      'migrations',
      '20261007140000_delete_html_package_version.sql',
    ),
    'utf-8',
  )

  it('exige admin, que la versión sea del paquete y que no sea la activa', () => {
    expect(sql).toMatch(/public\.is_admin\(\)/)
    expect(sql).toMatch(/package_id = p_content_id/)
    expect(sql).toMatch(
      /v_status = 'published' or v_current_version_id = p_version_id/,
    )
  })

  it('borra solo esa fila, deja rastro en audit_log y devuelve la ruta de Storage', () => {
    expect(sql).toMatch(
      /delete from public\.html_package_version\s+where id = p_version_id/,
    )
    expect(sql).toMatch(/'delete_package_version'/)
    expect(sql).toMatch(/return v_storage_path/)
  })

  it('solo la pueden ejecutar usuarios autenticados', () => {
    expect(sql).toMatch(
      /revoke all on function public\.delete_html_package_version/,
    )
    expect(sql).toMatch(
      /grant execute on function public\.delete_html_package_version\(uuid, uuid\) to authenticated/,
    )
  })
})

describe('supabaseHtmlPackageRepository.deleteVersion', () => {
  it('borra primero la fila (RPC) y después todos los ficheros, también los de subcarpetas', async () => {
    const order: string[] = []

    rpc.mockImplementation(async () => {
      order.push('rpc')
      return { data: `${CONTENT_ID}/v1`, error: null }
    })
    list.mockImplementation(async (prefix: string) => {
      order.push(`list:${prefix}`)

      if (prefix === `${CONTENT_ID}/v1`) {
        return { data: [file('index.html'), folder('assets')], error: null }
      }

      return { data: [file('a.js'), file('b.png')], error: null }
    })
    remove.mockImplementation(async () => {
      order.push('remove')
      return { error: null }
    })

    const result = await supabaseHtmlPackageRepository.deleteVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(result).toEqual({
      storagePath: `${CONTENT_ID}/v1`,
      storageFailed: 0,
    })
    expect(rpc).toHaveBeenCalledWith('delete_html_package_version', {
      p_content_id: CONTENT_ID,
      p_version_id: VERSION_ID,
    })
    expect(order).toEqual([
      'rpc',
      `list:${CONTENT_ID}/v1`,
      `list:${CONTENT_ID}/v1/assets`,
      'remove',
    ])
    expect(remove).toHaveBeenCalledWith([
      `${CONTENT_ID}/v1/index.html`,
      `${CONTENT_ID}/v1/assets/a.js`,
      `${CONTENT_ID}/v1/assets/b.png`,
    ])
  })

  it('pagina el listado cuando hay más de 100 entradas', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => file(`f${i}.js`))
    const page2 = [file('last.js')]

    list
      .mockResolvedValueOnce({ data: page1, error: null })
      .mockResolvedValueOnce({ data: page2, error: null })

    await supabaseHtmlPackageRepository.deleteVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(list).toHaveBeenCalledTimes(2)
    expect(list.mock.calls[1][1]).toMatchObject({ offset: 100 })
    expect(remove.mock.calls[0][0]).toHaveLength(101)
  })

  it('si la base de datos rechaza el borrado (p. ej. versión activa), NO toca Storage', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'No se puede borrar la versión activa.',
        code: 'P0001',
      },
    })

    await expect(
      supabaseHtmlPackageRepository.deleteVersion({
        contentId: CONTENT_ID,
        versionId: VERSION_ID,
      }),
    ).rejects.toMatchObject({ code: 'P0001' })

    expect(from).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })

  it('si Storage falla, la versión ya está borrada y se cuenta lo que quedó', async () => {
    list.mockResolvedValue({
      data: [file('index.html'), file('x.js')],
      error: null,
    })
    remove.mockResolvedValue({ error: { message: 'boom' } })

    const result = await supabaseHtmlPackageRepository.deleteVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(result.storageFailed).toBe(2)
  })

  it('si falla el listado de Storage, no lanza y marca fallo', async () => {
    list.mockResolvedValue({ data: null, error: { message: 'list boom' } })

    const result = await supabaseHtmlPackageRepository.deleteVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(result.storageFailed).toBeGreaterThan(0)
    expect(remove).not.toHaveBeenCalled()
  })

  it('una versión sin ficheros en Storage no llama a remove', async () => {
    list.mockResolvedValue({ data: [], error: null })

    const result = await supabaseHtmlPackageRepository.deleteVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(result.storageFailed).toBe(0)
    expect(remove).not.toHaveBeenCalled()
  })
})
