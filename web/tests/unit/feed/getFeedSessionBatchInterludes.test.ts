import { describe, it, expect, vi } from 'vitest'
import { makeGetFeedSessionBatch } from '@/modules/feed/application/getFeedSessionBatch'
import type {
  FeedCatalog,
  FeedSession,
  FeedSessionRepository,
} from '@/modules/feed/domain/feedPorts'
import {
  isNewsletterItem,
  isPinItem,
  type FeedBatchItem,
  type FeedInterlude,
  type PinDirectoryEntry,
} from '@/modules/feed/domain/feedReadModels'
import {
  newsletterItemId,
  planInterludes,
} from '@/modules/feed/domain/interludes'
import {
  encodeCursor,
  signedFeedCursor,
} from '@/modules/feed/infrastructure/cursor'
import type { FeedConfig } from '@/modules/feed/domain'

/**
 * Interludios en el caso de uso (plan de `other`, fase 2): calendario por
 * seed, solo en la home sin exclusión, newsletter omitida si el visitante ya
 * está suscrito, página que rota sus pines, lotes de 20 y de 40
 * equivalentes y cursores anteriores a la fase 2 (sin `served`).
 */

const ROUND_SIZE = 200

const CASES = Array.from({ length: ROUND_SIZE }, (_, i) => ({
  contentId: `case-${i + 1}`,
  pinIds: [`pin-${i + 1}`],
  force: 1,
}))

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

const DATASET = {
  snapshot: { cases: CASES, insights: [], tools: [], channel: [], other: [] },
  pinDirectory: Object.fromEntries(
    CASES.map((c) => [c.pinIds[0], entry(c.contentId, 'case')]),
  ) as Record<string, PinDirectoryEntry>,
}

const CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  batchSize: 40,
}

const NEWSLETTER: FeedInterlude = {
  kind: 'newsletter',
  contentId: 'news-1',
  frequency: 50,
  title: 'Suscríbete',
  text: 'Una carta al mes',
}

const PAGE: FeedInterlude = {
  kind: 'page',
  contentId: 'page-1',
  frequency: 40,
  pins: [
    { pinId: 'page-pin-1', entry: entry('page-1', 'other') },
    { pinId: 'page-pin-2', entry: entry('page-1', 'other') },
    { pinId: 'page-pin-3', entry: entry('page-1', 'other') },
  ],
}

function session(overrides: Partial<FeedSession> = {}): FeedSession {
  return {
    id: 'session-1',
    seed: 'seed-interludios',
    scope: 'home',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    excludeContentId: null,
    ...overrides,
  }
}

function build({
  feedSession = session(),
  interludes = [NEWSLETTER, PAGE] as FeedInterlude[] | Error,
}: {
  feedSession?: FeedSession
  interludes?: FeedInterlude[] | Error
} = {}) {
  const rounds = new Map<string, string[]>()
  const interludesPort = vi.fn(async () => {
    if (interludes instanceof Error) throw interludes
    return interludes
  })
  const sessions: FeedSessionRepository = {
    create: vi.fn(),
    get: async (id) => (id === feedSession.id ? feedSession : null),
    getRound: async (id, index) => rounds.get(`${id}:${index}`) ?? null,
    saveRound: async (id, index, ids) => {
      rounds.set(`${id}:${index}`, ids)
    },
  }
  const catalog: FeedCatalog = {
    dataset: async () => DATASET,
    directoryByIds: async (ids) =>
      Object.fromEntries(
        ids.map((id) => [id, DATASET.pinDirectory[id]]),
      ) as Record<string, PinDirectoryEntry>,
    config: async () => CONFIG,
    interludes: interludesPort,
  }

  return {
    interludesPort,
    run: makeGetFeedSessionBatch({
      sessions,
      catalog,
      cursors: signedFeedCursor,
    }),
  }
}

type Run = ReturnType<typeof build>['run']

/** Lee `pins` pines de ronda en lotes del tamaño pedido. */
async function readPins(
  run: Run,
  pins: number,
  size: number,
  options: { newsletterSubscribed?: boolean } = {},
): Promise<FeedBatchItem[]> {
  const all: FeedBatchItem[] = []
  let cursor: string | null = null
  let roundPins = 0

  for (let guard = 0; roundPins < pins && guard < 50; guard++) {
    const batch: Awaited<ReturnType<Run>> = await run(
      'session-1',
      cursor,
      size,
      options,
    )
    all.push(...batch.items)
    roundPins += batch.items.filter((item) =>
      isPinItem(item) ? item.kind === 'case' : false,
    ).length
    cursor = batch.cursor
  }

  return all
}

/**
 * Posición (1-based, en pines de ronda) tras la que sale cada interludio, en
 * orden de aparición. Es una lista y no un mapa: una página repite pinId.
 */
function positions(items: FeedBatchItem[]): { id: string; position: number }[] {
  const result: { id: string; position: number }[] = []
  let roundPins = 0

  for (const item of items) {
    if (isPinItem(item) && item.kind === 'case') {
      roundPins += 1
    } else {
      result.push({ id: item.pinId, position: roundPins })
    }
  }

  return result
}

describe('getFeedSessionBatch — interludios', () => {
  it('intercala los `other` en las posiciones del calendario de la seed', async () => {
    const { run } = build()
    const items = await readPins(run, 120, 40)
    const expected = planInterludes('seed-interludios', [NEWSLETTER, PAGE], 120)
    const got = new Map(positions(items).map((p) => [p.id, p.position]))

    for (const slot of expected) {
      const id =
        slot.contentId === 'news-1'
          ? newsletterItemId('news-1', slot.occurrence)
          : undefined
      if (id) expect(got.get(id)).toBe(slot.position)
    }

    expect(positions(items).length).toBeGreaterThanOrEqual(expected.length)
    expect(items.filter(isNewsletterItem).length).toBeGreaterThan(0)
  })

  it('la primera aparición queda entre el pin 10 y el 30 y nunca hay dos seguidas', async () => {
    const { run } = build()
    const items = await readPins(run, 150, 40)
    const interludePositions = positions(items).map((p) => p.position)

    expect(interludePositions[0]).toBeGreaterThanOrEqual(10)
    expect(interludePositions[0]).toBeLessThanOrEqual(30)

    for (let i = 1; i < interludePositions.length; i++) {
      expect(
        interludePositions[i]! - interludePositions[i - 1]!,
      ).toBeGreaterThanOrEqual(5)
    }
  })

  it('es determinista: misma seed, mismos interludios', async () => {
    const a = await readPins(build().run, 120, 40)
    const b = await readPins(build().run, 120, 40)

    expect(a.map((item) => item.pinId)).toEqual(b.map((item) => item.pinId))
  })

  it('servir en lotes de 20 o de 40 da la misma secuencia', async () => {
    const big = await readPins(build().run, 160, 40)
    const small = await readPins(build().run, 160, 20)
    const common = Math.min(big.length, small.length)

    expect(common).toBeGreaterThan(160)
    expect(small.slice(0, common).map((item) => item.pinId)).toEqual(
      big.slice(0, common).map((item) => item.pinId),
    )
  })

  it('una newsletter ya suscrita se omite sin sustituirla por otro `other`', async () => {
    const free = await readPins(build().run, 120, 40)
    const subscribed = await readPins(build().run, 120, 40, {
      newsletterSubscribed: true,
    })

    expect(free.some(isNewsletterItem)).toBe(true)
    expect(subscribed.some(isNewsletterItem)).toBe(false)
    // La página sigue saliendo en los mismos huecos.
    const pageIds = (items: FeedBatchItem[]) =>
      items
        .filter((item) => isPinItem(item) && item.kind === 'other')
        .map((item) => item.pinId)
    expect(pageIds(subscribed)).toEqual(pageIds(free))
  })

  it('una página con varios pines rota entre ellos y apunta a /variety/{slug}/app', async () => {
    const items = await readPins(build({ interludes: [PAGE] }).run, 200, 40)
    const pagePins = items.filter(
      (item) => isPinItem(item) && item.kind === 'other',
    )

    expect(pagePins.length).toBeGreaterThanOrEqual(3)
    expect(new Set(pagePins.map((item) => item.pinId)).size).toBeGreaterThan(1)

    for (const item of pagePins) {
      expect(isPinItem(item) && item.destination).toBe(
        '/variety/page-1-slug/app',
      )
    }
  })

  it('los interludios no entran en las recomendaciones de una ficha (excludeContentId)', async () => {
    const { run, interludesPort } = build({
      feedSession: session({ excludeContentId: 'case-7' }),
    })
    const items = await readPins(run, 80, 40)

    expect(positions(items)).toHaveLength(0)
    expect(interludesPort).not.toHaveBeenCalled()
  })

  it('tampoco en las subhomes (scope distinto de home)', async () => {
    const { run, interludesPort } = build({
      feedSession: session({ scope: 'work' }),
    })
    const items = await readPins(run, 80, 40)

    expect(positions(items)).toHaveLength(0)
    expect(interludesPort).not.toHaveBeenCalled()
  })

  it('si falla la lectura de los `other`, el feed se sirve igual sin interludios', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { run } = build({ interludes: new Error('supabase caído') })
    const batch = await run('session-1', null, 40)

    expect(batch.items).toHaveLength(40)
    expect(batch.items.every(isPinItem)).toBe(true)
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it('el cursor lleva `served` (pines de ronda, sin contar interludios)', async () => {
    const { run } = build()
    const first = await run('session-1', null, 40)
    const second = await run('session-1', first.cursor, 40)
    const decoded = signedFeedCursor.decode(second.cursor)

    expect(decoded?.served).toBe(80)
  })

  it('un cursor anterior a la fase 2 (served = 0) sigue sirviendo', async () => {
    const { run } = build()
    const legacy = encodeCursor({
      sessionId: 'session-1',
      roundIndex: 0,
      offset: 0,
      served: 0,
    })
    const batch = await run('session-1', legacy, 40)

    expect(batch.items.filter(isPinItem).length).toBeGreaterThanOrEqual(40)
  })
})
