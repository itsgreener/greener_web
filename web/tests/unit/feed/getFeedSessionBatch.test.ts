import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeGetFeedSessionBatch } from '@/modules/feed/application/getFeedSessionBatch'
import {
  FeedSessionNotFoundError,
  InvalidFeedCursorError,
} from '@/modules/feed/domain/feedErrors'
import type {
  FeedCatalog,
  FeedSession,
  FeedSessionRepository,
} from '@/modules/feed/domain/feedPorts'
import type {
  FeedBatchResult,
  FeedPinItem,
  PinDirectoryEntry,
} from '@/modules/feed/domain/feedReadModels'
import {
  encodeCursor,
  signedFeedCursor,
} from '@/modules/feed/infrastructure/cursor'
import type { FeedConfig } from '@/modules/feed/domain'

/** Dobles en memoria de los puertos; se pueden reasignar en cada test. */
interface GetFeedSessionBatchDeps {
  getSession: FeedSessionRepository['get']
  getRound: FeedSessionRepository['getRound']
  saveRound: FeedSessionRepository['saveRound']
  getDataset: FeedCatalog['dataset']
  getConfig: FeedCatalog['config']
  getDirectoryByIds: FeedCatalog['directoryByIds']
  getInterludes: FeedCatalog['interludes']
}

/**
 * El caso de uso sobre los dobles, resolviéndolos en cada llamada. Estos
 * tests no usan interludios (catálogo sin `other`), así que todos los
 * elementos son pines.
 */
async function getFeedSessionBatch(
  sessionId: string,
  cursor: string | null,
  d: GetFeedSessionBatchDeps,
  size?: number | null,
): Promise<Omit<FeedBatchResult, 'items'> & { items: FeedPinItem[] }> {
  const result = await makeGetFeedSessionBatch({
    sessions: {
      create: vi.fn(),
      get: (id) => d.getSession(id),
      getRound: (id, index) => d.getRound(id, index),
      saveRound: (id, index, ids) => d.saveRound(id, index, ids),
    },
    catalog: {
      dataset: (scope, exclude) => d.getDataset(scope, exclude),
      directoryByIds: (ids) => d.getDirectoryByIds(ids),
      config: () => d.getConfig(),
      interludes: () => d.getInterludes(),
    },
    cursors: signedFeedCursor,
  })(sessionId, cursor, size)

  return { ...result, items: result.items as FeedPinItem[] }
}

const SESSION: FeedSession = {
  id: 'session-1',
  seed: 'test-seed',
  scope: 'home',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  excludeContentId: null,
}

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  batchSize: 40,
}

// Universo mínimo pero suficiente para que generateRound produzca una
// tanda no vacía: 2 casos con fuerza 2 cada uno.
const DATASET = {
  snapshot: {
    cases: [
      { contentId: 'case-1', pinIds: ['pin-1', 'pin-2'], force: 2 },
      { contentId: 'case-2', pinIds: ['pin-3', 'pin-4'], force: 2 },
    ],
    insights: [],
    tools: [],
    channel: [],
    other: [],
  },
  pinDirectory: {
    'pin-1': entry('case-1', 'case'),
    'pin-2': entry('case-1', 'case'),
    'pin-3': entry('case-2', 'case'),
    'pin-4': entry('case-2', 'case'),
  } as Record<string, PinDirectoryEntry>,
}

function entry(
  contentId: string,
  contentType: PinDirectoryEntry['contentType'],
): PinDirectoryEntry {
  return {
    contentId,
    contentType,
    contentSlug: `${contentId}-slug`,
    ratio: '1:1',
    label: 'Pin de prueba',
    alt: 'Alt de prueba',
    autoplayMode: null,
    media: [{ kind: 'image', cloudinaryPublicId: `${contentId}/img` }],
  }
}

/** Repositorio en memoria: mismo contrato que feedSessionRepository, sin Supabase. */
function inMemoryDeps(): GetFeedSessionBatchDeps & {
  rounds: Map<string, string[]>
} {
  const rounds = new Map<string, string[]>()
  return {
    rounds,
    getSession: vi.fn(async (id: string) =>
      id === SESSION.id ? SESSION : null,
    ),
    getRound: vi.fn(
      async (sessionId: string, roundIndex: number) =>
        rounds.get(`${sessionId}:${roundIndex}`) ?? null,
    ),
    saveRound: vi.fn(
      async (sessionId: string, roundIndex: number, pinIds: string[]) => {
        rounds.set(`${sessionId}:${roundIndex}`, pinIds)
      },
    ),
    getDataset: vi.fn(async () => DATASET),
    getConfig: vi.fn(async () => CONFIG),
    getInterludes: vi.fn(async () => []),
    getDirectoryByIds: vi.fn(async (pinIds: string[]) =>
      Object.fromEntries(pinIds.map((id) => [id, DATASET.pinDirectory[id]])),
    ),
  }
}

describe('getFeedSessionBatch', () => {
  let deps: ReturnType<typeof inMemoryDeps>

  beforeEach(() => {
    deps = inMemoryDeps()
  })

  it('sin sesión, lanza FeedSessionNotFoundError', async () => {
    await expect(getFeedSessionBatch('no-existe', null, deps)).rejects.toThrow(
      FeedSessionNotFoundError,
    )
  })

  it('con sesión caducada, lanza FeedSessionNotFoundError', async () => {
    deps.getSession = vi.fn(async () => ({
      ...SESSION,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    }))
    await expect(getFeedSessionBatch(SESSION.id, null, deps)).rejects.toThrow(
      FeedSessionNotFoundError,
    )
  })

  it('primer lote (sin cursor): genera la ronda 0, la persiste y devuelve items enriquecidos', async () => {
    const result = await getFeedSessionBatch(SESSION.id, null, deps)

    expect(result.items.length).toBe(4) // force 2 + force 2, sin más tipos en el universo
    expect(result.hasMore).toBe(true)
    for (const item of result.items) {
      // especificacion-final-formato-detalle.md §7: episode se unifica
      // con case bajo /work/[slug] — aquí solo hay casos, pero la ruta es
      // la misma para ambos.
      expect(item.destination).toMatch(/^\/work\//)
      expect(item.kind).toBe('case')
      // §1: el CTA del pin es fijo por tipo — case/episode/other → Watch.
      expect(item.cta).toBe('Watch')
      expect(item.media).toEqual([expect.objectContaining({ kind: 'image' })])
    }
    expect(deps.rounds.get(`${SESSION.id}:0`)).toEqual(
      result.items.map((i) => i.pinId),
    )
    expect(deps.getDataset).toHaveBeenCalledTimes(1)
  })

  it('auditoría 8 oct, P0-6: un pin despublicado después de guardar la ronda se omite, no tumba el lote', async () => {
    const first = await getFeedSessionBatch(SESSION.id, null, deps)
    const unpublished = first.items[0].pinId

    // Al releer la ronda guardada, el directorio público ya no tiene ese pin.
    vi.mocked(deps.getDirectoryByIds).mockImplementationOnce(async (pinIds) =>
      Object.fromEntries(
        pinIds
          .filter((id) => id !== unpublished)
          .map((id) => [id, DATASET.pinDirectory[id]]),
      ),
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const again = await getFeedSessionBatch(SESSION.id, null, deps)

    expect(again.items.length).toBeGreaterThan(0)
    expect(again.items.some((item) => item.pinId === unpublished)).toBe(false)
    expect(again.items.length).toBe(
      first.items.filter((item) => item.pinId !== unpublished).length,
    )
    warn.mockRestore()
  })

  it('una ronda ya cacheada NO vuelve a leer el catálogo completo (getDataset)', async () => {
    const first = await getFeedSessionBatch(SESSION.id, null, deps)
    vi.clearAllMocks()

    const second = await getFeedSessionBatch(SESSION.id, null, deps)

    expect(second.items).toEqual(first.items)
    expect(deps.getDataset).not.toHaveBeenCalled()
    expect(deps.getDirectoryByIds).toHaveBeenCalledTimes(1)
  })

  it('el cursor devuelto avanza a roundIndex+1 y sirve la siguiente ronda al usarlo', async () => {
    const first = await getFeedSessionBatch(SESSION.id, null, deps)
    const second = await getFeedSessionBatch(SESSION.id, first.cursor, deps)

    expect(deps.rounds.has(`${SESSION.id}:1`)).toBe(true)
    // Con seed fija, la ronda 1 es determinista pero no tiene por qué
    // coincidir con la ronda 0 pin a pin (offset avanza con roundIndex).
    expect(second.items.length).toBe(4)
  })

  it('devuelve el índice de ronda (round) que lee el evento Feed Depth', async () => {
    const first = await getFeedSessionBatch(SESSION.id, null, deps)
    const second = await getFeedSessionBatch(SESSION.id, first.cursor, deps)

    expect(first.round).toBe(0)
    expect(second.round).toBe(1)
    expect(first.batch).toBe(0)
  })

  it('un cursor de otra sesión se rechaza (InvalidFeedCursorError)', async () => {
    const cursorDeOtraSesion = encodeCursor({
      sessionId: 'otra-sesion',
      roundIndex: 0,
      offset: 0,
      served: 0,
    })
    await expect(
      getFeedSessionBatch(SESSION.id, cursorDeOtraSesion, deps),
    ).rejects.toThrow(InvalidFeedCursorError)
  })

  it('un cursor corrupto se rechaza (InvalidFeedCursorError)', async () => {
    await expect(
      getFeedSessionBatch(SESSION.id, 'basura', deps),
    ).rejects.toThrow(InvalidFeedCursorError)
  })

  it('es determinista: la misma sesión y ronda producen siempre los mismos pines', async () => {
    const a = await getFeedSessionBatch(SESSION.id, null, deps)

    const deps2 = inMemoryDeps()
    const b = await getFeedSessionBatch(SESSION.id, null, deps2)

    expect(a.items.map((i) => i.pinId)).toEqual(b.items.map((i) => i.pinId))
  })

  it('un pin de tool usa CTA "Use" y un insight "Read" (§1)', async () => {
    // El motor de cuotas ancla el tamaño de la tanda a los casos
    // (T = ceil(N_cases / ratio_cases), arquitectura §8.2): un universo
    // sin ningún caso produce una tanda vacía, así que hace falta al
    // menos uno para que el resto de tipos tengan hueco en la ronda.
    const toolDataset = {
      snapshot: {
        cases: [{ contentId: 'case-1', pinIds: ['pin-c'], force: 5 }],
        insights: [{ contentId: 'insight-1', pinIds: ['pin-i'] }],
        tools: [{ contentId: 'tool-1', pinIds: ['pin-t'] }],
        channel: [],
        other: [],
      },
      pinDirectory: {
        'pin-c': entry('case-1', 'case'),
        'pin-i': entry('insight-1', 'insight'),
        'pin-t': entry('tool-1', 'tool'),
      } as Record<string, PinDirectoryEntry>,
    }

    deps.getDataset = vi.fn(async () => toolDataset)
    deps.getDirectoryByIds = vi.fn(async (ids: string[]) =>
      Object.fromEntries(ids.map((id) => [id, toolDataset.pinDirectory[id]])),
    )

    const result = await getFeedSessionBatch(SESSION.id, null, deps)

    const toolItem = result.items.find((i) => i.pinId === 'pin-t')
    const insightItem = result.items.find((i) => i.pinId === 'pin-i')

    expect(toolItem?.cta).toBe('Use')
    // La ficha de Tool recibe el pin de origen (?pin=) para usar su medio
    // como portada.
    expect(toolItem?.destination).toBe('/tools/tool-1-slug?pin=pin-t')
    expect(insightItem?.cta).toBe('Read')
    // Los insights abren directamente el contenido real (/app), sin
    // pasar por su página de detalle; las tools siguen yendo al detalle.
    expect(insightItem?.destination).toBe('/insights/insight-1-slug/app')
  })

  it('sesión de recomendaciones (detalle de caso/tool/episodio, scope home + excludeContentId): el insight también abre /app', async () => {
    // Las páginas de detalle piden su panel de recomendaciones con
    // POST /api/feed/sessions { scope: 'home', excludeContentId } y pintan
    // el destino que devuelve esta API tal cual (PinCard). Es el mismo
    // camino que la home: un insight nunca debe apuntar a su detalle.
    const recSession: FeedSession = {
      ...SESSION,
      excludeContentId: 'case-actual',
    }
    deps.getSession = vi.fn(async () => recSession)
    const insightDataset = {
      snapshot: {
        cases: [],
        insights: [
          { contentId: 'insight-1', pinIds: ['pin-i'], force: 1 },
          { contentId: 'insight-2', pinIds: ['pin-i2'], force: 1 },
        ],
        tools: [],
        channel: [],
        other: [],
      },
      pinDirectory: {
        'pin-i': entry('insight-1', 'insight'),
        'pin-i2': entry('insight-2', 'insight'),
      } as Record<string, PinDirectoryEntry>,
    }
    deps.getDataset = vi.fn(async () => insightDataset)

    const result = await getFeedSessionBatch(SESSION.id, null, deps)

    expect(deps.getDataset).toHaveBeenCalledWith('home', 'case-actual')
    const insights = result.items.filter((i) => i.kind === 'insight')
    expect(insights.length).toBeGreaterThan(0)
    for (const item of insights) {
      expect(item.destination).toMatch(/^\/insights\/[^/]+\/app$/)
    }

    // Y al releer la misma ronda ya guardada (otro camino de enrich),
    // el destino sigue siendo /app.
    deps.getDirectoryByIds = vi.fn(async (ids: string[]) =>
      Object.fromEntries(
        ids.map((id) => [id, insightDataset.pinDirectory[id]]),
      ),
    )
    const again = await getFeedSessionBatch(SESSION.id, null, deps)
    for (const item of again.items.filter((i) => i.kind === 'insight')) {
      expect(item.destination).toMatch(/^\/insights\/[^/]+\/app$/)
    }
  })

  it('para una ronda nueva, pide el dataset con el scope de la sesión, no siempre "home"', async () => {
    const insightsSession: FeedSession = { ...SESSION, scope: 'insights' }
    deps.getSession = vi.fn(async () => insightsSession)

    await getFeedSessionBatch(SESSION.id, null, deps)

    expect(deps.getDataset).toHaveBeenCalledWith('insights', null)
  })

  it('panel de recomendaciones (especificacion-final-formato-detalle.md §1, §6): pasa excludeContentId de la sesión al dataset', async () => {
    const sessionExcluyendoContenido: FeedSession = {
      ...SESSION,
      excludeContentId: 'case-2',
    }
    deps.getSession = vi.fn(async () => sessionExcluyendoContenido)

    await getFeedSessionBatch(SESSION.id, null, deps)

    expect(deps.getDataset).toHaveBeenCalledWith('home', 'case-2')
  })

  it('panel de recomendaciones: el contenido excluido nunca aparece en la ronda generada', async () => {
    // Simula lo que hace de verdad getFeedDataset con excludeContentId: si
    // se pide excluir 'case-2', ese caso ni siquiera entra en el universo
    // que ve generateRound — no es un filtro sobre la tanda ya generada.
    const datasetSinCase2 = {
      snapshot: {
        cases: [{ contentId: 'case-1', pinIds: ['pin-1', 'pin-2'], force: 4 }],
        insights: [],
        tools: [],
        channel: [],
        other: [],
      },
      pinDirectory: {
        'pin-1': entry('case-1', 'case'),
        'pin-2': entry('case-1', 'case'),
      } as Record<string, PinDirectoryEntry>,
    }

    const sessionExcluyendoContenido: FeedSession = {
      ...SESSION,
      excludeContentId: 'case-2',
    }
    deps.getSession = vi.fn(async () => sessionExcluyendoContenido)
    deps.getDataset = vi.fn(async (_scope?: string, exclude?: string | null) =>
      exclude === 'case-2' ? datasetSinCase2 : DATASET,
    )
    deps.getDirectoryByIds = vi.fn(async (ids: string[]) =>
      Object.fromEntries(
        ids.map((id) => [id, datasetSinCase2.pinDirectory[id]]),
      ),
    )

    const result = await getFeedSessionBatch(SESSION.id, null, deps)

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items.every((i) => i.contentId !== 'case-2')).toBe(true)
  })

  describe('ronda servida por tramos', () => {
    // 10 casos de fuerza 1: una ronda de 10 pines.
    const cases = Array.from({ length: 10 }, (_, i) => ({
      contentId: `case-${i + 1}`,
      pinIds: [`pin-${i + 1}`],
      force: 1,
    }))
    const bigDataset = {
      snapshot: { cases, insights: [], tools: [], channel: [], other: [] },
      pinDirectory: Object.fromEntries(
        cases.map((c) => [c.pinIds[0], entry(c.contentId, 'case')]),
      ) as Record<string, PinDirectoryEntry>,
    }

    beforeEach(() => {
      deps.getDataset = vi.fn(async () => bigDataset)
      deps.getConfig = vi.fn(async () => ({ ...CONFIG, batchSize: 4 }))
      deps.getDirectoryByIds = vi.fn(async (ids: string[]) =>
        Object.fromEntries(ids.map((id) => [id, bigDataset.pinDirectory[id]])),
      )
    })

    async function readAll(size?: number | null) {
      const batches = []
      let cursor: string | null = null
      for (let i = 0; i < 6; i++) {
        const batch = await getFeedSessionBatch(SESSION.id, cursor, deps, size)
        batches.push(batch)
        cursor = batch.cursor
      }
      return batches
    }

    it('parte la ronda en lotes de batch_size y el siguiente tramo continúa donde lo dejó el anterior', async () => {
      const batches = await readAll()

      expect(batches.slice(0, 3).map((b) => b.items.length)).toEqual([4, 4, 2])
      expect(batches.slice(0, 3).map((b) => [b.round, b.batch])).toEqual([
        [0, 0],
        [0, 1],
        [0, 2],
      ])
      // Los tres lotes son exactamente la ronda 0 guardada, en su orden.
      expect(
        batches.slice(0, 3).flatMap((b) => b.items.map((i) => i.pinId)),
      ).toEqual(deps.rounds.get(`${SESSION.id}:0`))
      // El cuarto lote es el principio de la ronda 1.
      expect([batches[3].round, batches[3].batch]).toEqual([1, 0])
    })

    it('la ronda se genera una sola vez y los tramos siguientes solo piden las fichas de su tramo', async () => {
      const first = await getFeedSessionBatch(SESSION.id, null, deps)
      await getFeedSessionBatch(SESSION.id, first.cursor, deps)

      expect(deps.getDataset).toHaveBeenCalledTimes(1)
      expect(deps.saveRound).toHaveBeenCalledTimes(1)
      expect(deps.getDirectoryByIds).toHaveBeenCalledTimes(1)
      expect(vi.mocked(deps.getDirectoryByIds).mock.calls[0][0]).toHaveLength(4)
    })

    it('el cliente puede pedir un lote más pequeño (móvil: 20) pero nunca más grande que el configurado', async () => {
      const small = await getFeedSessionBatch(SESSION.id, null, deps, 2)
      expect(small.items).toHaveLength(2)

      const big = await getFeedSessionBatch(SESSION.id, null, deps, 500)
      expect(big.items).toHaveLength(4)

      const invalid = await getFeedSessionBatch(SESSION.id, null, deps, -3)
      expect(invalid.items).toHaveLength(4)
    })

    it('un tramo cuyos pines se despublicaron se salta y se sirve el siguiente', async () => {
      const full = await getFeedSessionBatch(SESSION.id, null, deps)
      const firstSlice = new Set(full.items.map((i) => i.pinId))
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      deps.getDirectoryByIds = vi.fn(async (ids: string[]) =>
        Object.fromEntries(
          ids
            .filter((id) => !firstSlice.has(id))
            .map((id) => [id, bigDataset.pinDirectory[id]]),
        ),
      )

      const result = await getFeedSessionBatch(SESSION.id, null, deps)

      expect(result.items).toHaveLength(4)
      expect(result.items.some((i) => firstSlice.has(i.pinId))).toBe(false)
      expect(result.batch).toBe(1)
      warn.mockRestore()
    })

    it('un offset más allá del final de la ronda (cursor viejo) pasa al principio de la ronda siguiente', async () => {
      await getFeedSessionBatch(SESSION.id, null, deps)
      const stale = encodeCursor({
        sessionId: SESSION.id,
        roundIndex: 0,
        offset: 999,
        served: 0,
      })

      const result = await getFeedSessionBatch(SESSION.id, stale, deps)

      expect(result.round).toBe(1)
      expect(result.batch).toBe(0)
    })

    it('un universo sin pines devuelve un lote vacío con cursor, sin dar vueltas', async () => {
      deps.getDataset = vi.fn(async () => ({
        snapshot: {
          cases: [],
          insights: [],
          tools: [],
          channel: [],
          other: [],
        },
        pinDirectory: {},
      }))

      const result = await getFeedSessionBatch(SESSION.id, null, deps)

      expect(result.items).toEqual([])
      expect(result.cursor).toEqual(expect.any(String))
    })
  })
})
