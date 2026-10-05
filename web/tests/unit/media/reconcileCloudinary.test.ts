import { describe, expect, it } from 'vitest'
import {
  findOrphanAssets,
  MANAGED_PREFIX,
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
