import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getFeedSessionBatch,
  FeedSessionNotFoundError,
  InvalidFeedCursorError,
  type GetFeedSessionBatchDeps,
} from '@/modules/feed/application/getFeedSessionBatch'
import { encodeCursor } from '@/modules/feed/infrastructure/cursor'
import type { FeedSessionRow } from '@/modules/feed/infrastructure/feedSessionRepository'
import type { PinDirectoryEntry } from '@/modules/feed/infrastructure/supabaseFeedSource'
import type { FeedConfig } from '@/modules/feed/domain'

const SESSION: FeedSessionRow = {
  id: 'session-1',
  seed: 'test-seed',
  scope: 'home',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  excludeContentId: null,
}

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  mixWindow: 20,
  distanceWindow: 10,
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

  it('un cursor de otra sesión se rechaza (InvalidFeedCursorError)', async () => {
    const cursorDeOtraSesion = encodeCursor({
      sessionId: 'otra-sesion',
      roundIndex: 0,
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
    expect(toolItem?.destination).toBe('/tools/tool-1-slug')
    expect(insightItem?.cta).toBe('Read')
    expect(insightItem?.destination).toBe('/insights/insight-1-slug')
  })

  it('para una ronda nueva, pide el dataset con el scope de la sesión, no siempre "home"', async () => {
    const insightsSession: FeedSessionRow = { ...SESSION, scope: 'insights' }
    deps.getSession = vi.fn(async () => insightsSession)

    await getFeedSessionBatch(SESSION.id, null, deps)

    expect(deps.getDataset).toHaveBeenCalledWith('insights', null)
  })

  it('panel de recomendaciones (especificacion-final-formato-detalle.md §1, §6): pasa excludeContentId de la sesión al dataset', async () => {
    const sessionExcluyendoContenido: FeedSessionRow = {
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

    const sessionExcluyendoContenido: FeedSessionRow = {
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
})
