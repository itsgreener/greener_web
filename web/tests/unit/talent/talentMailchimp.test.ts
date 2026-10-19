import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  TALENT_MAILCHIMP_TAG,
  talentMailchimpNewsletter,
} from '@/modules/talent/infrastructure/talentMailchimp'

const fetchMock = vi.fn()
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Mailchimp de talent', () => {
  it('usa la audiencia de talent con la clave y el prefijo de Greener (misma cuenta)', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({}, 200))

    await talentMailchimpNewsletter.subscribe('Ada@Example.com')

    const urls = fetchMock.mock.calls.map(([url]) => url as string)

    expect(urls[0]).toContain(
      'https://us21.api.mailchimp.com/3.0/lists/test-talent-audience-id/members/',
    )
    expect(urls[1]).toBe(
      'https://us21.api.mailchimp.com/3.0/lists/test-talent-audience-id/members',
    )
    expect(urls.join()).not.toContain('test-audience-id/')

    for (const [, init] of fetchMock.mock.calls) {
      expect(init.headers.Authorization).toBe('Bearer test-mailchimp-key-us21')
    }
  })

  it('doble opt-in: el alta nace pending y con la etiqueta de talent', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({}, 200))

    await talentMailchimpNewsletter.subscribe('ada@example.com')

    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      email_address: 'ada@example.com',
      status: 'pending',
      tags: [TALENT_MAILCHIMP_TAG],
    })
  })

  it('un fallo de Mailchimp se propaga (el caso de uso decide ignorarlo)', async () => {
    fetchMock.mockResolvedValueOnce(json({ title: 'Forbidden' }, 403))

    await expect(
      talentMailchimpNewsletter.subscribe('a@b.co'),
    ).rejects.toThrow()
  })
})
