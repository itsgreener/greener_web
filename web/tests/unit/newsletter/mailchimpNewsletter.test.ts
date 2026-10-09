import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MAILCHIMP_TIMEOUT_MS,
  subscribeEmailInMailchimp,
} from '@/modules/newsletter/infrastructure/mailchimpNewsletter'

// md5('test@example.com'), calculado aparte: así el test falla si cambia
// la normalización o el algoritmo del hash que exige Mailchimp.
const HASH = '55502f40dc8b7c769880b10874abc9d0'
const BASE = 'https://us21.api.mailchimp.com/3.0'
const MEMBER_URL = `${BASE}/lists/test-audience-id/members/${HASH}`

const fetchMock = vi.fn()

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('subscribeEmailInMailchimp', () => {
  it('email nuevo (404): lo crea como pending con la etiqueta, para el double opt-in', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ title: 'Resource Not Found' }, 404))
      .mockResolvedValueOnce(json({ id: 'x' }, 200))

    const result = await subscribeEmailInMailchimp('  Test@Example.com ')

    expect(result).toEqual({ status: 'confirmation_sent' })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    expect(fetchMock.mock.calls[0][0]).toBe(MEMBER_URL)
    expect(fetchMock.mock.calls[0][1].method).toBe('GET')

    const [createUrl, createInit] = fetchMock.mock.calls[1]

    expect(createUrl).toBe(`${BASE}/lists/test-audience-id/members`)
    expect(createInit.method).toBe('POST')
    expect(JSON.parse(createInit.body)).toEqual({
      email_address: 'test@example.com',
      status: 'pending',
      tags: ['Greener Website'],
    })
  })

  it('manda la API key como Bearer y nunca la cachea', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({}, 200))

    await subscribeEmailInMailchimp('test@example.com')

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers.Authorization).toBe('Bearer test-mailchimp-key-us21')
      expect(init.cache).toBe('no-store')
    }
  })

  it('ya suscrito: no modifica nada', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 'subscribed' }))

    await expect(
      subscribeEmailInMailchimp('test@example.com'),
    ).resolves.toEqual({ status: 'already_subscribed' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('ya pendiente de confirmar: no duplica ni reenvía', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 'pending' }))

    await expect(
      subscribeEmailInMailchimp('test@example.com'),
    ).resolves.toEqual({ status: 'confirmation_pending' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each(['unsubscribed', 'transactional', 'archived'])(
    'estado %s: vuelve a pending (PATCH) para exigir confirmación',
    async (status) => {
      fetchMock
        .mockResolvedValueOnce(json({ status }))
        .mockResolvedValueOnce(json({ status: 'pending' }))

      const result = await subscribeEmailInMailchimp('test@example.com')

      expect(result).toEqual({ status: 'confirmation_sent' })

      const [url, init] = fetchMock.mock.calls[1]

      expect(url).toBe(MEMBER_URL)
      expect(init.method).toBe('PATCH')
      expect(JSON.parse(init.body)).toEqual({ status: 'pending' })
    },
  )

  it('cleaned: no fuerza el alta y lanza un error reconocible (undeliverable)', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 'cleaned' }))

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      /undeliverable/,
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('un error de la API al comprobar (no 404) no se oculta ni crea nada', async () => {
    fetchMock.mockResolvedValueOnce(json({ title: 'API Key Invalid' }, 401))

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'Mailchimp could not check this subscriber.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('si falla la creación, lanza error genérico y registra el motivo sin la API key', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(
        json({ title: 'Forgotten Email Not Subscribed', detail: 'x' }, 400),
      )

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'Mailchimp could not start the confirmation process.',
    )

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)

    expect(logged).toContain('Forgotten Email Not Subscribed')
    expect(logged).not.toContain('test-mailchimp-key')
  })

  it('si falla el PATCH, lanza el error genérico', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: 'unsubscribed' }))
      .mockResolvedValueOnce(json({ title: 'Boom' }, 500))

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'Mailchimp could not start the confirmation process.',
    )
  })

  it('una respuesta de error que no es JSON no rompe el registro del fallo', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 502 }))

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'Mailchimp could not check this subscriber.',
    )
  })

  it('cada llamada lleva tiempo máximo (AbortSignal)', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({}, 200))

    await subscribeEmailInMailchimp('test@example.com')

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.signal).toBeInstanceOf(AbortSignal)
    }

    expect(MAILCHIMP_TIMEOUT_MS).toBeGreaterThan(0)
    expect(MAILCHIMP_TIMEOUT_MS).toBeLessThanOrEqual(15_000)
  })

  it('si Mailchimp no responde a tiempo, falla con un error propio (no se queda colgado)', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError')

    fetchMock.mockRejectedValueOnce(timeout)

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'Mailchimp did not respond in time.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('un corte de red tampoco se propaga en crudo', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'Mailchimp could not be reached.',
    )
  })

  it('un timeout en el segundo paso (crear) también se controla', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockRejectedValueOnce(new DOMException('x', 'TimeoutError'))

    await expect(subscribeEmailInMailchimp('test@example.com')).rejects.toThrow(
      'did not respond in time',
    )
  })
})
