import { expect, test } from '../support/test'

/**
 * Tarjetas de pin del feed: cada una es un enlace a la ficha del contenido
 * (`/work/<slug>`, con o sin `?pin=`). La navegación solo enlaza a `/work`
 * sin slug, así que este selector solo coge pines.
 */
const PIN_LINKS = 'a[href^="/work/"]'

test.describe('Feed', () => {
  // E1 — primera carga del feed (plan de mejoras §9.3).
  test('E1: la primera carga pinta el lote completo sin errores de consola', async ({
    page,
    consoleProblems,
  }) => {
    await page.goto('/')

    // 40 pines por lote en escritorio (feed_config.batch_size).
    await expect(page.locator(PIN_LINKS).first()).toBeVisible()
    await expect
      .poll(() => page.locator(PIN_LINKS).count())
      .toBeGreaterThanOrEqual(40)

    expect(consoleProblems).toEqual([])
  })
})
