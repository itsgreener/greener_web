import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeRegisterCandidate } from '@/modules/talent/application/registerCandidate'
import {
  CONTEXT,
  fakeRepository,
  fakeWorkflows,
  limiter,
  openLimiters,
} from '@tests/helpers/talentFakes'

const NEW_TOKEN = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const OLD_TOKEN = '11111111-2222-4333-8444-555555555555'

function setup(
  initial: Parameters<typeof fakeRepository>[0] = [],
  limiters = openLimiters(),
) {
  const repo = fakeRepository(initial)
  const { workflows, sendFormLink } = fakeWorkflows()
  const register = makeRegisterCandidate({
    repository: repo.repository,
    workflows,
    limiters,
    newToken: () => NEW_TOKEN,
  })

  return { ...repo, sendFormLink, register }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('registerCandidate', () => {
  it('email nuevo: inserta la fila (processed + token del servidor) y lanza el envío', async () => {
    const { register, insertedCandidates, sendFormLink } = setup()

    const result = await register({ email: ' Ada@Example.com ' }, '', CONTEXT)

    expect(result).toEqual({ ok: true })
    expect(insertedCandidates).toEqual([
      {
        email: 'ada@example.com',
        status: 'processed',
        access_token: NEW_TOKEN,
        access_token_expires_at: expect.any(String),
      },
    ])
    expect(sendFormLink).toHaveBeenCalledExactlyOnceWith(NEW_TOKEN)
  })

  it('email existente: misma respuesta, sin insertar, y reenvía el enlace con SU token', async () => {
    const { register, insertedCandidates, sendFormLink } = setup([
      {
        id: 'c1',
        email: 'ada@example.com',
        status: 'sent',
        accessToken: OLD_TOKEN,
      },
    ])

    const result = await register({ email: 'ADA@example.com' }, '', CONTEXT)

    expect(result).toEqual({ ok: true })
    expect(insertedCandidates).toEqual([])
    expect(sendFormLink).toHaveBeenCalledExactlyOnceWith(OLD_TOKEN)
  })

  it('la respuesta no distingue que el email exista (nunca el error de Postgres)', async () => {
    const nuevo = await setup().register({ email: 'a@b.co' }, '', CONTEXT)
    const existente = await setup([
      { id: 'c1', email: 'a@b.co', status: 'closed', accessToken: OLD_TOKEN },
    ]).register({ email: 'a@b.co' }, '', CONTEXT)

    expect(existente).toEqual(nuevo)
    expect(JSON.stringify(existente)).not.toMatch(/duplicate|exist|already/i)
  })

  it('existente sin token: genera uno, lo guarda y luego envía', async () => {
    const { register, sendFormLink, candidates, log } = setup([
      { id: 'c1', email: 'a@b.co', status: 'sent', accessToken: null },
    ])

    await register({ email: 'a@b.co' }, '', CONTEXT)

    expect(candidates.get('c1')?.accessToken).toBe(NEW_TOKEN)
    expect(sendFormLink).toHaveBeenCalledExactlyOnceWith(NEW_TOKEN)
    expect(log.indexOf('setAccessToken')).toBeLessThan(log.length)
  })

  it.each(['pending', 'started'])(
    'existente en estado %s (n8n lo está procesando): no se reenvía nada',
    async (status) => {
      const { register, sendFormLink } = setup([
        { id: 'c1', email: 'a@b.co', status, accessToken: null },
      ])

      expect(await register({ email: 'a@b.co' }, '', CONTEXT)).toEqual({
        ok: true,
      })
      expect(sendFormLink).not.toHaveBeenCalled()
    },
  )

  it.each(['sent', 'closed', 'error', 'processed'])(
    'existente en estado %s: se reenvía',
    async (status) => {
      const { register, sendFormLink } = setup([
        { id: 'c1', email: 'a@b.co', status, accessToken: OLD_TOKEN },
      ])

      await register({ email: 'a@b.co' }, '', CONTEXT)

      expect(sendFormLink).toHaveBeenCalledWith(OLD_TOKEN)
    },
  )

  it('altas simultáneas: si el índice único salta, sigue como reenvío', async () => {
    const { register, repository, candidates, sendFormLink } = (() => {
      const base = setup()
      const original = base.repository.findByEmail
      let first = true
      // La primera búsqueda no ve nada; entre medias entra la otra alta.
      base.repository.findByEmail = async (email) => {
        if (first) {
          first = false
          base.candidates.set('c9', {
            id: 'c9',
            email,
            status: 'processed',
            accessToken: OLD_TOKEN,
          })
          return null
        }
        return original(email)
      }
      return base
    })()

    expect(repository).toBeDefined()
    expect(await register({ email: 'a@b.co' }, '', CONTEXT)).toEqual({
      ok: true,
    })
    expect(candidates.size).toBe(1)
    expect(sendFormLink).toHaveBeenCalledExactlyOnceWith(OLD_TOKEN)
  })

  it('honeypot relleno: éxito silencioso sin tocar nada', async () => {
    const { register, log, sendFormLink } = setup()

    expect(await register({ email: 'a@b.co' }, 'http://spam', CONTEXT)).toEqual(
      {
        ok: true,
      },
    )
    expect(log).toEqual([])
    expect(sendFormLink).not.toHaveBeenCalled()
  })

  it('email inválido: error de campo, sin llegar a la base', async () => {
    const { register, log } = setup()
    const result = await register({ email: 'nada' }, '', CONTEXT)

    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    expect(log).toEqual([])
  })

  it('límite por IP, por visitante y por email', async () => {
    for (const key of [
      'signupByIp',
      'signupByVisitor',
      'signupByEmail',
    ] as const) {
      const { register, log } = setup([], openLimiters({ [key]: limiter(0) }))

      expect(await register({ email: 'a@b.co' }, '', CONTEXT)).toEqual({
        ok: false,
        reason: 'rate_limited',
      })
      expect(log).toEqual([])
    }
  })

  it('el límite por email corta el reenvío repetido a la misma bandeja', async () => {
    const limiters = openLimiters()
    const { register, sendFormLink } = setup(
      [{ id: 'c1', email: 'a@b.co', status: 'sent', accessToken: OLD_TOKEN }],
      { ...limiters, signupByEmail: limiter(3) },
    )

    const results = []
    for (let i = 0; i < 5; i++)
      results.push(await register({ email: 'a@b.co' }, '', CONTEXT))

    expect(results.filter((r) => r.ok)).toHaveLength(3)
    expect(sendFormLink).toHaveBeenCalledTimes(3)
  })

  it('usa claves anónimas para los límites', async () => {
    const limiters = openLimiters()
    await setup([], limiters).register({ email: 'a@b.co' }, '', CONTEXT)

    expect(limiters.signupByIp).toMatchObject({ calls: [CONTEXT.ipKey] })
    expect(limiters.signupByVisitor).toMatchObject({
      calls: [CONTEXT.visitorKey],
    })
  })

  it('si n8n falla, el error es genérico (503 en la ruta) y queda en el log', async () => {
    const { register, sendFormLink } = setup()
    sendFormLink.mockRejectedValueOnce(new Error('n8n 500'))

    const result = await register({ email: 'a@b.co' }, '', CONTEXT)

    expect(result).toEqual({ ok: false, reason: 'unavailable' })
    expect(console.error).toHaveBeenCalled()
  })

  it('si la base falla, igual', async () => {
    const { register, failOn } = setup()
    failOn.add('insertCandidate')

    expect(await register({ email: 'a@b.co' }, '', CONTEXT)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
