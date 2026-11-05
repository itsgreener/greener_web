import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeGetCandidateForm } from '@/modules/talent/application/getCandidateForm'
import {
  CONTEXT,
  TOKEN,
  fakeRepository,
  limiter,
  openLimiters,
} from '@tests/helpers/talentFakes'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function setup(limiters = openLimiters()) {
  const repo = fakeRepository([
    {
      id: 'c1',
      email: 'ada@example.com',
      status: 'closed',
      accessToken: TOKEN,
    },
  ])
  const original = repo.repository.findFormByToken

  repo.repository.findFormByToken = async (token) => {
    const record = await original(token)

    return (
      record && {
        ...record,
        name: 'Ada',
        workTypes: ['Freelance'],
        projects: [{ link: 'https://a.example', comment: null }],
        files: [
          { id: 'f1', path: 'uploads/abc.PDF', status: 'pending' },
          { id: 'f2', path: 'uploads/sin-extension', status: 'pending' },
        ],
        // Campos que NO deben salir (el repositorio real tampoco los lee)
        ...({
          status: 'closed',
          accessToken: TOKEN,
          ai_comment: 'secreto',
        } as object),
      }
    )
  }

  return {
    get: makeGetCandidateForm({ repository: repo.repository, limiters }),
  }
}

describe('getCandidateForm', () => {
  it('devuelve solo los campos del formulario, con valores por defecto en lugar de null', async () => {
    const result = await setup().get(TOKEN, CONTEXT)

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(Object.keys(result.form).sort()).toEqual(
      [
        'comment',
        'email',
        'experience',
        'files',
        'languages',
        'name',
        'newsletterAccepted',
        'phone',
        'profile',
        'projects',
        'rateDay',
        'rateHour',
        'socials',
        'workTypes',
      ].sort(),
    )
    expect(result.form).toMatchObject({
      email: 'ada@example.com',
      name: 'Ada',
      phone: '',
      profile: [],
      languages: {},
      socials: {},
      newsletterAccepted: false,
      workTypes: ['Freelance'],
    })
  })

  it('nunca expone token, estado, ruta del CV ni comentario de la IA', async () => {
    const result = await setup().get(TOKEN, CONTEXT)
    const json = JSON.stringify(result)

    expect(json).not.toContain(TOKEN)
    expect(json).not.toContain('secreto')
    expect(json).not.toContain('uploads/')
    expect(json).not.toContain('closed')
  })

  it('de cada fichero solo salen el id y la extensión', async () => {
    const result = await setup().get(TOKEN, CONTEXT)

    expect(result.ok && result.form.files).toEqual([
      { id: 'f1', extension: 'pdf' },
      { id: 'f2', extension: '' },
    ])
  })

  it('token inexistente, mal formado o vacío: la misma respuesta', async () => {
    const { get } = setup()
    const missing = await get('00000000-0000-4000-8000-000000000000', CONTEXT)

    expect(missing).toEqual({ ok: false, reason: 'not_found' })
    expect(await get('x', CONTEXT)).toEqual(missing)
    expect(await get('', CONTEXT)).toEqual(missing)
  })

  it('límite por IP', async () => {
    const { get } = setup(openLimiters({ formReadByIp: limiter(0) }))

    expect(await get(TOKEN, CONTEXT)).toEqual({
      ok: false,
      reason: 'rate_limited',
    })
  })
})
