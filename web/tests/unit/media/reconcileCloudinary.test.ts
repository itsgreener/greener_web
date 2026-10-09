import { describe, expect, it, vi } from 'vitest'
import {
  applyCleanup,
  deleteFromCloudinary,
  deleteMediaRows,
  findOrphanAssets,
  findUnreferencedMedia,
  listMediaRows,
  listReferencedMediaIds,
  MANAGED_PREFIX,
  parseArgs,
} from '../../../scripts/reconcile-cloudinary.mjs'

const NOW = Date.parse('2026-10-05T12:00:00Z')
const HOUR = 60 * 60 * 1000

function asset(
  publicId: string,
  hoursOld: number | null,
  resourceType = 'image',
) {
  return {
    publicId,
    resourceType,
    bytes: 1000,
    createdAt:
      hoursOld === null
        ? 'no-es-una-fecha'
        : new Date(NOW - hoursOld * HOUR).toISOString(),
  }
}

function orphans(
  assets: ReturnType<typeof asset>[],
  registered: string[],
  minAgeMs?: number,
) {
  return findOrphanAssets({
    assets,
    registeredPublicIds: new Set(registered),
    now: NOW,
    ...(minAgeMs === undefined ? {} : { minAgeMs }),
  }).map((a: { publicId: string }) => a.publicId)
}

describe('reconcile-cloudinary — findOrphanAssets (5 oct 2026)', () => {
  it('solo mira greener/content/', () => {
    expect(MANAGED_PREFIX).toBe('greener/content/')
  })

  it('un archivo registrado en media_asset NO es huérfano', () => {
    expect(
      orphans([asset('greener/content/a', 100)], ['greener/content/a']),
    ).toEqual([])
  })

  it('un archivo antiguo sin registrar SÍ es huérfano (imagen o vídeo)', () => {
    expect(
      orphans(
        [
          asset('greener/content/a', 100),
          asset('greener/content/videos/b', 100, 'video'),
        ],
        [],
      ),
    ).toEqual(['greener/content/a', 'greener/content/videos/b'])
  })

  it('un archivo reciente sin registrar NO se toca: puede ser una subida en curso', () => {
    expect(orphans([asset('greener/content/a', 0.5)], [])).toEqual([])
  })

  it('la antigüedad mínima es configurable (por defecto 1 h)', () => {
    expect(orphans([asset('greener/content/a', 2)], [])).toEqual([
      'greener/content/a',
    ])
    expect(orphans([asset('greener/content/a', 2)], [], 3 * HOUR)).toEqual([])
    expect(orphans([asset('greener/content/a', 0.01)], [], 0)).toEqual([
      'greener/content/a',
    ])
  })

  it('un archivo fuera de greener/content/ nunca es huérfano, aunque nadie lo registre', () => {
    expect(
      orphans(
        [asset('otra-cosa/logo', 1000), asset('greener/otra/x', 1000)],
        [],
      ),
    ).toEqual([])
  })

  it('sin fecha válida, ante la duda NO se borra', () => {
    expect(orphans([asset('greener/content/a', null)], [])).toEqual([])
  })

  it('acepta una lista (no solo un Set) de ids registrados', () => {
    const result = findOrphanAssets({
      assets: [asset('greener/content/a', 100)],
      registeredPublicIds: ['greener/content/a'],
      now: NOW,
    })

    expect(result).toEqual([])
  })

  it('mezcla: devuelve solo los huérfanos de verdad', () => {
    expect(
      orphans(
        [
          asset('greener/content/vivo', 100),
          asset('greener/content/basura', 100),
          asset('greener/content/reciente', 0.1),
          asset('ajeno/x', 100),
        ],
        ['greener/content/vivo'],
      ),
    ).toEqual(['greener/content/basura'])
  })
})

// ---------------------------------------------------------------------
// Tipo 2: filas de media_asset que nada referencia (5 oct 2026)
// ---------------------------------------------------------------------

function row(
  id: string,
  publicId: string,
  hoursOld: number | null,
  kind: 'image' | 'video' = 'video',
) {
  return {
    id,
    publicId,
    kind,
    createdAt:
      hoursOld === null
        ? 'no-es-una-fecha'
        : new Date(NOW - hoursOld * HOUR).toISOString(),
  }
}

function unreferenced(
  rows: ReturnType<typeof row>[],
  referenced: string[],
  assets: ReturnType<typeof asset>[] = [],
  extra: { minAgeMs?: number; prefix?: string } = {},
) {
  return findUnreferencedMedia({
    mediaRows: rows,
    referencedIds: new Set(referenced),
    assets,
    now: NOW,
    ...extra,
  })
}

describe('findUnreferencedMedia — filas sin ninguna referencia', () => {
  it('una fila que algo referencia NO se marca', () => {
    expect(unreferenced([row('m1', 'greener/content/a', 100)], ['m1'])).toEqual(
      [],
    )
  })

  it('una fila que nadie referencia SÍ se marca, aunque esté en la tabla', () => {
    const result = unreferenced([row('m1', 'greener/content/a', 100)], [])

    expect(result.map((r) => r.id)).toEqual(['m1'])
  })

  it('indica si su archivo existe en Cloudinary y cuánto pesa (por tipo y public id)', () => {
    const result = unreferenced(
      [
        row('m1', 'greener/content/videos/a', 100, 'video'),
        row('m2', 'greener/content/b', 100, 'image'),
      ],
      [],
      [asset('greener/content/videos/a', 100, 'video')],
    )

    expect(result[0]).toMatchObject({
      id: 'm1',
      assetExists: true,
      bytes: 1000,
    })
    expect(result[1]).toMatchObject({ id: 'm2', assetExists: false, bytes: 0 })
  })

  it('un public id igual pero de OTRO tipo (imagen vs vídeo) no cuenta como su archivo', () => {
    const [result] = unreferenced(
      [row('m1', 'greener/content/a', 100, 'video')],
      [],
      [asset('greener/content/a', 100, 'image')],
    )

    expect(result.assetExists).toBe(false)
  })

  it('una fila registrada hace menos de 1 h NO se marca: puede ser un registro en curso', () => {
    expect(unreferenced([row('m1', 'greener/content/a', 0.5)], [])).toEqual([])
  })

  it('la antigüedad se mide con created_at de la FILA y es configurable', () => {
    expect(
      unreferenced([row('m1', 'greener/content/a', 2)], [], [], {
        minAgeMs: 3 * HOUR,
      }),
    ).toEqual([])

    expect(
      unreferenced([row('m1', 'greener/content/a', 0.01)], [], [], {
        minAgeMs: 0,
      }).map((r) => r.id),
    ).toEqual(['m1'])
  })

  it('una fila fuera de greener/content/ NO se marca nunca', () => {
    expect(unreferenced([row('m1', 'otra-carpeta/x', 1000)], [])).toEqual([])
    expect(unreferenced([row('m1', 'greener/otra/x', 1000)], [])).toEqual([])
  })

  it('--prefix más estricto limita también las filas', () => {
    const rows = [
      row('m1', 'greener/content/videos/a', 100),
      row('m2', 'greener/content/b', 100),
    ]

    expect(
      unreferenced(rows, [], [], { prefix: 'greener/content/videos/' }).map(
        (r) => r.id,
      ),
    ).toEqual(['m1'])
  })

  it('sin fecha válida, ante la duda NO se marca', () => {
    expect(unreferenced([row('m1', 'greener/content/a', null)], [])).toEqual([])
  })

  it('mezcla: solo las filas realmente huérfanas, las demás (en uso, recientes, ajenas) se respetan', () => {
    const result = unreferenced(
      [
        row('en-uso', 'greener/content/uso', 100),
        row('suelta', 'greener/content/suelta', 100),
        row('reciente', 'greener/content/reciente', 0.1),
        row('ajena', 'otra/x', 100),
      ],
      ['en-uso'],
    )

    expect(result.map((r) => r.id)).toEqual(['suelta'])
  })
})

// Cliente Supabase falso: SOLO admite from().select().order().range(). Si el
// código intentara filtrar (eq, in, neq…, p. ej. por el estado del
// contenido), lanzaría «no es una función» y el test fallaría.
function fakeSupabase(tables: Record<string, Record<string, unknown>[]>) {
  const calls: { table: string; columns: string }[] = []

  return {
    calls,
    client: {
      from(table: string) {
        const builder = {
          select(columns: string) {
            calls.push({ table, columns })
            return builder
          },
          order() {
            return builder
          },
          range(from: number, to: number) {
            return Promise.resolve({
              data: (tables[table] ?? []).slice(from, to + 1),
              error: null,
            })
          },
        }

        return builder
      },
    },
  }
}

describe('listReferencedMediaIds — qué cuenta como «en uso»', () => {
  it('recoge las cuatro referencias: pin, carrusel de caso, portada y og', async () => {
    const { client } = fakeSupabase({
      pin_media: [{ media_id: 'de-pin' }],
      case_detail_media: [{ media_id: 'de-carrusel' }],
      content: [{ cover_media_id: 'de-portada', og_media_id: 'de-og' }],
    })

    expect(await listReferencedMediaIds(client)).toEqual(
      new Set(['de-pin', 'de-carrusel', 'de-portada', 'de-og']),
    )
  })

  it('ignora los null (contenido sin portada ni og) y repetidos', async () => {
    const { client } = fakeSupabase({
      pin_media: [{ media_id: 'x' }, { media_id: 'x' }],
      case_detail_media: [],
      content: [
        { cover_media_id: null, og_media_id: null },
        { cover_media_id: 'x', og_media_id: null },
      ],
    })

    expect(await listReferencedMediaIds(client)).toEqual(new Set(['x']))
  })

  it('NO filtra por el estado del contenido: el medio de un draft o de un contenido despublicado cuenta como en uso', async () => {
    // El fake no tiene eq/in/neq: si hubiera un filtro por status, lanzaría.
    const { client, calls } = fakeSupabase({
      pin_media: [{ media_id: 'medio-de-un-draft' }],
      case_detail_media: [],
      content: [
        { cover_media_id: 'portada-de-despublicado', og_media_id: null },
      ],
    })

    const referenced = await listReferencedMediaIds(client)

    expect(referenced.has('medio-de-un-draft')).toBe(true)
    expect(referenced.has('portada-de-despublicado')).toBe(true)

    // Y solo se leen las columnas de referencia, nunca `status`.
    expect(calls.map((c) => c.columns).join(' ')).not.toMatch(/status/)
  })

  it('pagina: lee más de una página de 1000 filas', async () => {
    const many = Array.from({ length: 2300 }, (_, i) => ({ media_id: `m${i}` }))
    const { client } = fakeSupabase({
      pin_media: many,
      case_detail_media: [],
      content: [],
    })

    expect((await listReferencedMediaIds(client)).size).toBe(2300)
  })

  it('un error de Supabase se propaga (no se borra nada sin saber qué está en uso)', async () => {
    const client = {
      from() {
        const builder = {
          select: () => builder,
          order: () => builder,
          range: () =>
            Promise.resolve({ data: null, error: { message: 'caída' } }),
        }

        return builder
      },
    }

    await expect(listReferencedMediaIds(client)).rejects.toThrow('caída')
  })
})

describe('listMediaRows', () => {
  it('lee TODAS las filas de media_asset (sin mirar el estado del contenido) y las normaliza', async () => {
    const { client, calls } = fakeSupabase({
      media_asset: [
        {
          id: 'm1',
          kind: 'video',
          cloudinary_public_id: 'greener/content/videos/a',
          created_at: '2026-10-01T10:00:00Z',
        },
      ],
    })

    expect(await listMediaRows(client)).toEqual([
      {
        id: 'm1',
        kind: 'video',
        publicId: 'greener/content/videos/a',
        createdAt: '2026-10-01T10:00:00Z',
      },
    ])

    expect(calls).toEqual([
      {
        table: 'media_asset',
        columns: 'id, kind, cloudinary_public_id, created_at',
      },
    ])
  })
})

describe('parseArgs', () => {
  it('por defecto es simulación y no incluye las filas sin referencias', () => {
    expect(parseArgs([])).toEqual({
      apply: false,
      includeUnreferenced: false,
      minAgeHours: 1,
      prefix: 'greener/content/',
    })
  })

  it('--delete y --include-unreferenced son independientes', () => {
    expect(parseArgs(['--delete'])).toMatchObject({
      apply: true,
      includeUnreferenced: false,
    })
    expect(parseArgs(['--include-unreferenced'])).toMatchObject({
      apply: false,
      includeUnreferenced: true,
    })
    expect(parseArgs(['--delete', '--include-unreferenced'])).toMatchObject({
      apply: true,
      includeUnreferenced: true,
    })
  })

  it('rechaza opciones desconocidas, antigüedades inválidas y prefijos fuera de greener/content/', () => {
    expect(() => parseArgs(['--borrar'])).toThrow('Opción desconocida')
    expect(() => parseArgs(['--min-age-hours=-1'])).toThrow()
    expect(() => parseArgs(['--min-age-hours=abc'])).toThrow()
    expect(() => parseArgs(['--prefix=otra/'])).toThrow('greener/content/')
  })
})

// ---------------------------------------------------------------------
// La parte destructiva, con fakes (5 oct 2026)
// ---------------------------------------------------------------------

type DeleteLog = { event: string; detail?: unknown }

// Supabase falso para borrar filas de media_asset. Un id en `fkIds` simula
// que sigue referenciado: el DELETE de cualquier lote que lo contenga falla
// con una violación de clave foránea (NO ACTION), como haría Postgres.
function fakeDeleteSupabase(fkIds: string[] = [], log: DeleteLog[] = []) {
  return {
    log,
    client: {
      from(table: string) {
        expect(table).toBe('media_asset')

        return {
          delete() {
            return {
              in(_column: string, ids: string[]) {
                return {
                  select() {
                    log.push({ event: 'delete-rows', detail: ids })

                    if (ids.some((id) => fkIds.includes(id))) {
                      return Promise.resolve({
                        data: null,
                        error: { message: 'violates foreign key constraint' },
                      })
                    }

                    return Promise.resolve({
                      data: ids.map((id) => ({ id })),
                      error: null,
                    })
                  },
                }
              },
            }
          },
        }
      },
    },
  }
}

// Cloudinary falso. `outcomes` fija el resultado por public id (por defecto
// «deleted»); `throwOn` hace que el lote que contenga ese id lance.
function fakeCloudinary(
  outcomes: Record<string, string> = {},
  throwOn: string[] = [],
  log: DeleteLog[] = [],
) {
  return {
    log,
    client: {
      api: {
        delete_resources(ids: string[], options: { resource_type: string }) {
          log.push({
            event: 'delete-files',
            detail: { type: options.resource_type, ids },
          })

          if (ids.some((id) => throwOn.includes(id))) {
            return Promise.reject(new Error('rate limit'))
          }

          return Promise.resolve({
            deleted: Object.fromEntries(
              ids.map((id) => [id, outcomes[id] ?? 'deleted']),
            ),
          })
        },
      },
    },
  }
}

const unrefRow = (
  id: string,
  publicId: string,
  kind: 'image' | 'video',
  assetExists = true,
) => ({
  id,
  publicId,
  kind,
  createdAt: '2026-09-01T00:00:00Z',
  assetExists,
  bytes: 1000,
})

describe('deleteMediaRows', () => {
  it('borra por lotes de 100', async () => {
    const { client, log } = fakeDeleteSupabase()
    const rows = Array.from({ length: 250 }, (_, i) =>
      unrefRow(`m${i}`, `p${i}`, 'image'),
    )

    const { deletedIds, failed } = await deleteMediaRows(client, rows)

    expect(deletedIds.size).toBe(250)
    expect(failed).toBe(0)
    expect(log.map((l) => (l.detail as string[]).length)).toEqual([
      100, 100, 50,
    ])
  })

  it('si una fila sigue referenciada (FK), el lote falla y se aísla: el resto SÍ se borra', async () => {
    const { client } = fakeDeleteSupabase(['m2'])
    const rows = ['m1', 'm2', 'm3'].map((id) =>
      unrefRow(id, `p-${id}`, 'image'),
    )

    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { deletedIds, failed } = await deleteMediaRows(client, rows)

    expect([...deletedIds].sort()).toEqual(['m1', 'm3'])
    expect(failed).toBe(1)
  })
})

describe('deleteFromCloudinary', () => {
  it('separa imágenes y vídeos y cuenta borrados; «not_found» cuenta como borrado', async () => {
    const { client, log } = fakeCloudinary({ ya: 'not_found' })

    const result = await deleteFromCloudinary(client, [
      { publicId: 'a', resourceType: 'image' },
      { publicId: 'ya', resourceType: 'video' },
    ])

    expect(result).toEqual({ deleted: 2, failed: 0 })
    expect(log.map((l) => (l.detail as { type: string }).type)).toEqual([
      'image',
      'video',
    ])
  })

  it('un fallo por archivo se cuenta, y un lote que lanza no tumba el proceso', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { client } = fakeCloudinary({ malo: 'failed' }, ['explota'])

    const result = await deleteFromCloudinary(client, [
      { publicId: 'ok', resourceType: 'image' },
      { publicId: 'malo', resourceType: 'image' },
      { publicId: 'explota', resourceType: 'video' },
    ])

    expect(result).toEqual({ deleted: 1, failed: 2 })
  })
})

describe('applyCleanup — orden y garantías', () => {
  const orphanFile = {
    publicId: 'greener/content/suelto',
    resourceType: 'video',
    bytes: 1000,
    createdAt: '2026-09-01T00:00:00Z',
  }

  it('de las filas sin referencias borra PRIMERO la fila y DESPUÉS el archivo', async () => {
    const log: DeleteLog[] = []
    const db = fakeDeleteSupabase([], log)
    const cloud = fakeCloudinary({}, [], log)

    const summary = await applyCleanup({
      supabase: db.client,
      cloudinary: cloud.client,
      orphanFiles: [],
      unreferenced: [unrefRow('m1', 'greener/content/videos/a', 'video')],
      includeUnreferenced: true,
    })

    expect(log.map((l) => l.event)).toEqual(['delete-rows', 'delete-files'])
    expect(summary).toMatchObject({
      rowsDeleted: 1,
      unreferencedFilesDeleted: 1,
      failures: 0,
    })
  })

  it('si la fila NO se pudo borrar (sigue en uso), su archivo NO se toca', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const log: DeleteLog[] = []
    const db = fakeDeleteSupabase(['m1'], log)
    const cloud = fakeCloudinary({}, [], log)

    const summary = await applyCleanup({
      supabase: db.client,
      cloudinary: cloud.client,
      orphanFiles: [],
      unreferenced: [unrefRow('m1', 'greener/content/a', 'image')],
      includeUnreferenced: true,
    })

    expect(log.some((l) => l.event === 'delete-files')).toBe(false)
    expect(summary).toMatchObject({
      rowsDeleted: 0,
      unreferencedFilesDeleted: 0,
      failures: 1,
    })
  })

  it('una fila sin archivo en Cloudinary se borra solo de la tabla (no pide borrar nada a Cloudinary)', async () => {
    const log: DeleteLog[] = []
    const db = fakeDeleteSupabase([], log)
    const cloud = fakeCloudinary({}, [], log)

    const summary = await applyCleanup({
      supabase: db.client,
      cloudinary: cloud.client,
      orphanFiles: [],
      unreferenced: [unrefRow('m1', 'greener/content/a', 'image', false)],
      includeUnreferenced: true,
    })

    expect(summary.rowsDeleted).toBe(1)
    expect(log.some((l) => l.event === 'delete-files')).toBe(false)
  })

  it('SIN includeUnreferenced no toca ninguna fila ni sus archivos: solo los archivos sin fila', async () => {
    const log: DeleteLog[] = []
    const db = fakeDeleteSupabase([], log)
    const cloud = fakeCloudinary({}, [], log)

    const summary = await applyCleanup({
      supabase: db.client,
      cloudinary: cloud.client,
      orphanFiles: [orphanFile],
      unreferenced: [unrefRow('m1', 'greener/content/a', 'image')],
      includeUnreferenced: false,
    })

    expect(log.some((l) => l.event === 'delete-rows')).toBe(false)
    expect(log.filter((l) => l.event === 'delete-files')).toHaveLength(1)
    expect(summary).toMatchObject({ rowsDeleted: 0, orphanFilesDeleted: 1 })
  })

  it('hace los dos tipos y suma los fallos', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const db = fakeDeleteSupabase(['m2'])
    const cloud = fakeCloudinary({ 'greener/content/suelto': 'failed' })

    const summary = await applyCleanup({
      supabase: db.client,
      cloudinary: cloud.client,
      orphanFiles: [orphanFile],
      unreferenced: [
        unrefRow('m1', 'greener/content/a', 'image'),
        unrefRow('m2', 'greener/content/b', 'image'),
      ],
      includeUnreferenced: true,
    })

    expect(summary).toMatchObject({
      rowsDeleted: 1,
      unreferencedFilesDeleted: 1,
      unreferencedFailures: 1,
      orphanFilesDeleted: 0,
      orphanFailures: 1,
      failures: 2,
    })
  })

  it('sin nada que borrar no hace ninguna llamada', async () => {
    const log: DeleteLog[] = []

    const summary = await applyCleanup({
      supabase: fakeDeleteSupabase([], log).client,
      cloudinary: fakeCloudinary({}, [], log).client,
      orphanFiles: [],
      unreferenced: [],
      includeUnreferenced: true,
    })

    expect(log).toEqual([])
    expect(summary.failures).toBe(0)
  })
})
