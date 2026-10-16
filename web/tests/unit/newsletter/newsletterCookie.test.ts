// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { hasNewsletterCookie } from '@/modules/newsletter/client/newsletterCookie'
import {
  NEWSLETTER_COOKIE_MAX_AGE_SECONDS,
  NEWSLETTER_COOKIE_NAME,
  NEWSLETTER_COOKIE_VALUE,
} from '@/modules/newsletter/domain/newsletterCookie'

function clear() {
  document.cookie = `${NEWSLETTER_COOKIE_NAME}=; Max-Age=0; Path=/`
  document.cookie = 'otra=; Max-Age=0; Path=/'
}

afterEach(clear)

describe('cookie greener_newsletter', () => {
  it('nombre, valor y duración (12 meses) según el plan', () => {
    expect(NEWSLETTER_COOKIE_NAME).toBe('greener_newsletter')
    expect(NEWSLETTER_COOKIE_VALUE).toBe('1')
    expect(NEWSLETTER_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000)
  })

  it('sin cookie, el dispositivo no está suscrito', () => {
    expect(hasNewsletterCookie()).toBe(false)
  })

  it('con greener_newsletter=1 entre otras cookies, sí', () => {
    document.cookie = 'otra=x; Path=/'
    document.cookie = `${NEWSLETTER_COOKIE_NAME}=1; Path=/`

    expect(hasNewsletterCookie()).toBe(true)
  })

  it('con cualquier otro valor no cuenta', () => {
    document.cookie = `${NEWSLETTER_COOKIE_NAME}=0; Path=/`

    expect(hasNewsletterCookie()).toBe(false)
  })

  it('una cookie que solo se parece en el nombre no cuenta', () => {
    document.cookie = 'x_greener_newsletter=1; Path=/'

    expect(hasNewsletterCookie()).toBe(false)
    document.cookie = 'x_greener_newsletter=; Max-Age=0; Path=/'
  })
})
