import { expect, type Page } from '@playwright/test'

/** Ventana de cookies de la primera visita. */
export function cookieBanner(page: Page) {
  return page.getByRole('dialog', { name: 'Cookies' })
}

/**
 * Cierra la ventana de cookies con «Reject». En una pantalla de 1280×720 la
 * ventana tapa el final de /contact (el botón «Send» queda debajo y la página
 * no puede desplazarse más), así que quien rellena el formulario por primera
 * vez tiene que decidir antes de enviarlo.
 */
export async function rejectCookies(page: Page): Promise<void> {
  await cookieBanner(page)
    .getByRole('button', { name: 'Reject', exact: true })
    .click()
  await expect(cookieBanner(page)).toBeHidden()
}
