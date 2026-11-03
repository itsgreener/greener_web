import type { Page, Response } from '@playwright/test'

/**
 * Tarjetas de pin del feed: cada una es un enlace a la ficha del contenido
 * (`/work/<slug>`, con o sin `?pin=`). La navegación solo enlaza a `/work`
 * sin slug, así que este selector solo coge pines. Los datos de demo solo
 * tienen casos y episodios, y los dos viven bajo `/work/`.
 */
export const PIN_LINKS = 'a[href^="/work/"]'

/** Espera a que haya al menos `count` pines montados y devuelve sus enlaces, en el orden del feed. */
export async function pinHrefs(page: Page, count = 0): Promise<string[]> {
  if (count > 0) {
    await page.waitForFunction(
      ({ selector, min }) => document.querySelectorAll(selector).length >= min,
      { selector: PIN_LINKS, min: count },
    )
  }

  return page
    .locator(PIN_LINKS)
    .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
}

/**
 * Espaciadores (pines desmontados que solo guardan el hueco) que ahora mismo
 * tocan la zona visible. Con el colchón de montaje del feed no debería haber
 * ninguno: sería un hueco en blanco a la vista.
 */
export function visibleSpacers(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      [...document.querySelectorAll('[class*="spacer"]')].filter((el) => {
        const rect = el.getBoundingClientRect()
        return rect.bottom > 0 && rect.top < window.innerHeight
      }).length,
  )
}

/** Hijos del contenedor del feed (un pin, una tarjeta de newsletter o un espaciador por elemento). */
export function feedChildCount(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const first = document.querySelector(selector)
    return first?.parentElement?.children.length ?? 0
  }, PIN_LINKS)
}

/** Espera a que el navegador haya pintado dos fotogramas: el feed recalcula lo montado en el siguiente. */
export function nextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
}

/** Lote tal y como lo devuelve `GET /api/feed/{sessionId}`. */
export interface BatchBody {
  items: unknown[]
  cursor: string
  round: number
  batch: number
  hasMore: boolean
  rateLimited?: boolean
}

const BATCH_URL = /\/api\/feed\/[0-9a-f-]{36}(?:\?|$)/

export function isBatchResponse(response: Response): boolean {
  return (
    response.request().method() === 'GET' &&
    response.ok() &&
    BATCH_URL.test(
      new URL(response.url()).pathname + new URL(response.url()).search,
    )
  )
}

/**
 * Anota cada lote que recibe la página (solo los que traen pines: un lote
 * vacío por límite de peticiones no cuenta).
 */
export function recordBatches(page: Page): BatchBody[] {
  const batches: BatchBody[] = []

  page.on('response', async (response) => {
    if (!isBatchResponse(response)) return

    try {
      const body = (await response.json()) as BatchBody
      if (body.items.length > 0) batches.push(body)
    } catch {
      // Página cerrada antes de leer el cuerpo: no hay nada que anotar.
    }
  })

  return batches
}

export interface FeedTraffic {
  /** Peticiones a `/api/feed/…` hechas hasta ahora, en orden. */
  requests: string[]
  /** Cuántas siguen sin terminar. */
  inflight: () => number
}

/** Cuenta las peticiones de la página a la API del feed. */
export function trackFeedTraffic(page: Page): FeedTraffic {
  const requests: string[] = []
  let inflight = 0
  const isFeed = (url: string) => new URL(url).pathname.startsWith('/api/feed/')

  page.on('request', (request) => {
    if (!isFeed(request.url())) return
    requests.push(`${request.method()} ${request.url()}`)
    inflight += 1
  })
  const done = (request: { url(): string }) => {
    if (isFeed(request.url())) inflight = Math.max(0, inflight - 1)
  }
  page.on('requestfinished', done)
  page.on('requestfailed', done)

  return { requests, inflight: () => inflight }
}

/**
 * Espera a que el feed deje de moverse: sin peticiones en curso y con el mismo
 * número de elementos en tres observaciones seguidas. Un scroll puede dejar un
 * lote de prefetch a medias; si se navega en ese momento, ese lote se pide al
 * volver y no es un fallo de la restauración.
 */
export async function settleFeed(
  page: Page,
  traffic: FeedTraffic,
): Promise<void> {
  let stable = 0
  let last = -1

  for (let i = 0; i < 80 && stable < 3; i++) {
    await page.waitForTimeout(250)
    const count = await feedChildCount(page)
    stable = traffic.inflight() === 0 && count === last ? stable + 1 : 0
    last = count
  }

  if (stable < 3) throw new Error('El feed no llegó a quedarse quieto en 20 s')
}
