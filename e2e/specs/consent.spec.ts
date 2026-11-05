import { cookieBanner } from '../support/consent'
import { PIN_LINKS, pinHrefs } from '../support/feed'
import { expect, test } from '../support/test'

/** Proveedores de reproductor: nada de esto debe pedirse sin consentimiento. */
const THIRD_PARTY =
  /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|spotify\.com|scdn\.co)$/

// E6 — consentimiento y reproductor de un episodio (plan de mejoras §9.3).
test.describe('Consentimiento', () => {
  test('E6: sin aceptar no se carga nada de YouTube; al aceptar y pulsar play, el reproductor carga', async ({
    page,
    context,
    consoleProblems,
  }) => {
    // Cualquier petición a un proveedor se anota; las de YouTube reciben una
    // página mínima (los E2E no salen a internet).
    const thirdParty: string[] = []
    page.on('request', (request) => {
      if (THIRD_PARTY.test(new URL(request.url()).hostname)) {
        thirdParty.push(request.url())
      }
    })
    await page.route(/^https:\/\/www\.youtube-nocookie\.com\//, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>player stub</title><p>player</p>',
      }),
    )

    // Primera visita: la ventana de cookies aparece y no hay decisión guardada.
    await page.goto('/')
    await expect(cookieBanner(page)).toBeVisible()
    await expect(
      cookieBanner(page).getByRole('button', { name: 'Accept', exact: true }),
    ).toBeVisible()
    expect(
      (await context.cookies()).find((c) => c.name === 'greener_consent'),
    ).toBeUndefined()

    // Un episodio: en el subhome de Channel todos los pines lo son.
    await page.goto('/channel')
    await pinHrefs(page, 1)
    await page.locator(PIN_LINKS).first().click()
    await expect(page).toHaveURL(/\/work\/[^/?]+/)

    // La portada y el botón de play; ni iframe ni peticiones a terceros.
    const play = page.getByRole('button', { name: /^Play on YouTube$/ })
    await expect(play).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)

    // Pulsar play sin haber aceptado pide el consentimiento, no carga nada.
    await play.click()
    await expect(page.getByText('YouTube content')).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)

    // «Not now» cierra la petición sin cargar nada ni guardar decisión.
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByText('YouTube content')).toBeHidden()
    await expect(page.locator('iframe')).toHaveCount(0)
    expect(thirdParty).toEqual([])

    // Aceptar y reproducir: el reproductor carga y la decisión se recuerda.
    await play.click()
    await page.getByRole('button', { name: 'Accept cookies and play' }).click()

    const player = page.locator('iframe')
    await expect(player).toHaveCount(1)
    await expect(player).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]+\?autoplay=1$/,
    )
    await expect.poll(() => thirdParty.length).toBeGreaterThan(0)
    await expect(cookieBanner(page)).toBeHidden()
    await expect
      .poll(
        async () =>
          (await context.cookies()).find((c) => c.name === 'greener_consent')
            ?.value,
      )
      .toBeTruthy()

    expect(consoleProblems).toEqual([])
  })
})
