import { expect, stubExternalRequests, test } from '../support/test'
import {
  feedChildCount,
  nextFrames,
  PIN_LINKS,
  pinHrefs,
  recordBatches,
  settleFeed,
  trackFeedTraffic,
  visibleSpacers,
  type BatchBody,
} from '../support/feed'

/** Pines por lote en escritorio (feed_config.batch_size). */
const DESKTOP_BATCH = 40

test.describe('Feed', () => {
  // E1 — primera carga del feed (plan de mejoras §9.3).
  test('E1: la primera carga pinta el lote completo sin errores de consola', async ({
    page,
    consoleProblems,
  }) => {
    await page.goto('/')

    await expect(page.locator(PIN_LINKS).first()).toBeVisible()
    await expect
      .poll(() => page.locator(PIN_LINKS).count())
      .toBeGreaterThanOrEqual(DESKTOP_BATCH)

    expect(consoleProblems).toEqual([])
  })

  // E2 — la sesión guarda la seed: pedir lo mismo da lo mismo. (El plan decía
  // «dos POST con la misma cookie»; cada POST abre una sesión nueva con su
  // propia seed, que es justo lo que comprueba E3. Lo determinista es el
  // lote de una misma sesión.)
  test('E2: una misma sesión devuelve siempre los mismos lotes', async ({
    request,
  }) => {
    const created = await request.post('/api/feed/sessions', {
      data: { scope: 'home' },
    })
    expect(created.status()).toBe(201)
    const { sessionId } = (await created.json()) as { sessionId: string }

    const getBatch = async (cursor?: string): Promise<BatchBody> => {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
      const response = await request.get(`/api/feed/${sessionId}${query}`)
      expect(response.status()).toBe(200)
      return (await response.json()) as BatchBody
    }

    const first = await getBatch()
    expect(first.items).toHaveLength(DESKTOP_BATCH)
    expect(await getBatch()).toEqual(first)

    // El cursor encadena los lotes: el segundo también es estable, y distinto
    // del primero.
    const second = await getBatch(first.cursor)
    expect(second.items.length).toBeGreaterThan(0)
    expect(await getBatch(first.cursor)).toEqual(second)
    expect(second.items).not.toEqual(first.items)
  })

  // E3 — otra carga, otra seed.
  test('E3: recargar y entrar como otro visitante dan otro orden', async ({
    page,
    browser,
  }) => {
    await page.goto('/')
    const original = (await pinHrefs(page, DESKTOP_BATCH)).slice(0, 20)

    // Recarga real del documento: sesión nueva, seed nueva.
    await page.reload()
    const reloaded = (await pinHrefs(page, DESKTOP_BATCH)).slice(0, 20)
    expect(reloaded).not.toEqual(original)

    // Otro visitante (contexto limpio, sin cookies): también otro orden.
    const context = await browser.newContext({ locale: 'en' })
    try {
      const other = await context.newPage()
      await stubExternalRequests(other)
      await other.goto('/')
      const stranger = (await pinHrefs(other, DESKTOP_BATCH)).slice(0, 20)
      expect(stranger).not.toEqual(original)
      expect(stranger).not.toEqual(reloaded)
    } finally {
      await context.close()
    }
  })

  // E4 — ir a un detalle y volver conserva orden y posición, sin pedir nada.
  test('E4: volver desde un detalle conserva el orden y el scroll sin nuevas peticiones al feed', async ({
    page,
  }) => {
    const traffic = trackFeedTraffic(page)

    await page.goto('/')
    await pinHrefs(page, DESKTOP_BATCH)

    await page.evaluate(() => window.scrollTo(0, 1800))
    await expect
      .poll(() => page.evaluate(() => Math.round(window.scrollY)))
      .toBe(1800)
    await nextFrames(page)
    await settleFeed(page, traffic)

    const orderBefore = await pinHrefs(page)
    const scrollBefore = await page.evaluate(() => window.scrollY)

    // Un pin entero a la vista, para que el clic no mueva el scroll.
    const target = await page.evaluateHandle((selector) => {
      return (
        [...document.querySelectorAll<HTMLAnchorElement>(selector)].find(
          (a) => {
            const rect = a.getBoundingClientRect()
            return rect.top >= 0 && rect.bottom <= window.innerHeight
          },
        ) ?? null
      )
    }, PIN_LINKS)
    const element = target.asElement()
    expect(element, 'ningún pin entero en pantalla').not.toBeNull()
    await element!.click()

    await expect(page).toHaveURL(/\/work\/[^/?]+/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // La ficha abre su propio panel de recomendaciones (sesión y lotes aparte):
    // lo que cuenta es lo que se pide a partir de volver.
    await settleFeed(page, traffic)
    const requestsBeforeBack = traffic.requests.length

    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect
      .poll(async () =>
        Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore),
      )
      .toBeLessThanOrEqual(2)
    await pinHrefs(page, DESKTOP_BATCH)
    await nextFrames(page)

    // Al volver se montan primero los dos primeros lotes y el feed recalcula
    // el resto en el siguiente fotograma: se espera a que coincida.
    await expect.poll(() => pinHrefs(page)).toEqual(orderBefore)

    // Margen para que una petición indebida llegara a salir.
    await page.waitForTimeout(1000)
    expect(traffic.requests.slice(requestsBeforeBack)).toEqual([])
  })

  // E5 — scroll largo.
  test('E5: 12 lotes de scroll sin huecos a la vista ni lotes repetidos', async ({
    page,
    consoleProblems,
  }) => {
    test.setTimeout(150_000)

    const TARGET_BATCHES = 12
    const batches = recordBatches(page)

    await page.goto('/')
    await pinHrefs(page, DESKTOP_BATCH)

    const gaps: string[] = []

    for (let step = 0; step < 600 && batches.length < TARGET_BATCHES; step++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8))
      await nextFrames(page)

      const spacers = await visibleSpacers(page)
      if (spacers > 0) {
        const y = await page.evaluate(() => Math.round(window.scrollY))
        gaps.push(
          `paso ${step}, scroll ${y}: ${spacers} espaciadores a la vista`,
        )
      }

      // Al final de lo cargado se espera al siguiente lote (estado, no tiempo).
      const atEnd = await page.evaluate(
        () =>
          window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 50,
      )
      if (atEnd) {
        const received = batches.length
        await expect
          .poll(() => batches.length, { timeout: 20_000 })
          .toBeGreaterThan(received)
      }
    }

    expect(batches.length).toBeGreaterThanOrEqual(TARGET_BATCHES)
    expect(gaps).toEqual([])

    // Ningún lote llegó dos veces: cursores distintos y (ronda, tramo) siempre
    // crecientes.
    expect(new Set(batches.map((b) => b.cursor)).size).toBe(batches.length)
    const positions = batches.map((b) => b.round * 1000 + b.batch)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(new Set(positions).size).toBe(positions.length)

    // Y la página pinta exactamente lo recibido: un elemento por pin.
    const received = batches.reduce((sum, b) => sum + b.items.length, 0)
    await expect.poll(() => feedChildCount(page)).toBe(received)

    expect(consoleProblems).toEqual([])
  })
})
