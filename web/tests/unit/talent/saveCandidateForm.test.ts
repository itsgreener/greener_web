import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeSaveCandidateForm } from '@/modules/talent/application/saveCandidateForm'
import {
  CONTEXT,
  TOKEN,
  fakeNewsletter,
  fakeRepository,
  fakeWorkflows,
  limiter,
  openLimiters,
  validFormInput,
} from '@tests/helpers/talentFakes'

const CANDIDATE = {
  id: 'c1',
  email: 'ada@example.com',
  status: 'sent',
  accessToken: TOKEN,
}

function setup(limiters = openLimiters()) {
  const repo = fakeRepository([CANDIDATE])
  const { workflows, processCandidate } = fakeWorkflows()
  const { newsletter, subscribe } = fakeNewsletter()
  const order: string[] = []

  processCandidate.mockImplementation(async () => {
    order.push('webhook')
  })
  subscribe.mockImplementation(async () => {
    order.push('newsletter')
  })

  const save = makeSaveCandidateForm({
    repository: repo.repository,
    workflows,
    newsletter,
    limiters,
  })

  return { ...repo, processCandidate, subscribe, order, save }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('saveCandidateForm', () => {
  it('ejecuta la secuencia de hoy: candidato → proyectos → newsletter → webhook', async () => {
    const { save, log, order, updates, projects, processCandidate } = setup()

    const result = await save(TOKEN, validFormInput(), '', CONTEXT)

    expect(result).toEqual({ ok: true })
    expect(
      log.filter((s) => s === 'updateCandidate' || s === 'replaceProjects'),
    ).toEqual(['updateCandidate', 'replaceProjects'])
    expect(order).toEqual(['newsletter', 'webhook'])
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe('c1')
    expect(projects).toHaveLength(2)
    expect(processCandidate).toHaveBeenCalledExactlyOnceWith('c1')
  })

  it('da de alta en la newsletter con el email del candidato, no con uno del cuerpo', async () => {
    const { save, subscribe } = setup()

    await save(TOKEN, validFormInput({ email: 'otro@x.com' }), '', CONTEXT)

    expect(subscribe).toHaveBeenCalledExactlyOnceWith('ada@example.com')
  })

  it('sin aceptar la newsletter no se llama a Mailchimp', async () => {
    const { save, subscribe } = setup()

    await save(
      TOKEN,
      validFormInput({ newsletterAccepted: false }),
      '',
      CONTEXT,
    )

    expect(subscribe).not.toHaveBeenCalled()
  })

  it('un fallo de Mailchimp no impide terminar: el webhook se llama igual', async () => {
    const { save, subscribe, processCandidate } = setup()
    subscribe.mockRejectedValueOnce(new Error('mailchimp caído'))

    expect(await save(TOKEN, validFormInput(), '', CONTEXT)).toEqual({
      ok: true,
    })
    expect(processCandidate).toHaveBeenCalledTimes(1)
  })

  it('si falla el webhook, se pide reintentar (sin él la fila no llega a closed)', async () => {
    const { save, processCandidate } = setup()
    processCandidate.mockRejectedValueOnce(new Error('n8n'))

    expect(await save(TOKEN, validFormInput(), '', CONTEXT)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })

  it('si falla la base, no se llega a newsletter ni webhook', async () => {
    const { save, failOn, subscribe, processCandidate } = setup()
    failOn.add('replaceProjects')

    expect(await save(TOKEN, validFormInput(), '', CONTEXT)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(subscribe).not.toHaveBeenCalled()
    expect(processCandidate).not.toHaveBeenCalled()
  })

  it('token inexistente o mal formado: not_found, sin escribir', async () => {
    const { save, updates } = setup()

    expect(
      await save(
        '00000000-0000-4000-8000-000000000000',
        validFormInput(),
        '',
        CONTEXT,
      ),
    ).toEqual({
      ok: false,
      reason: 'not_found',
    })
    expect(await save('../x', validFormInput(), '', CONTEXT)).toEqual({
      ok: false,
      reason: 'not_found',
    })
    expect(updates).toEqual([])
  })

  it('cuerpo inválido: errores por campo y nada escrito', async () => {
    const { save, updates, processCandidate } = setup()

    const result = await save(
      TOKEN,
      validFormInput({ projects: [] }),
      '',
      CONTEXT,
    )

    expect(result).toMatchObject({
      ok: false,
      reason: 'invalid',
      fieldErrors: { projects: expect.any(Array) },
    })
    expect(updates).toEqual([])
    expect(processCandidate).not.toHaveBeenCalled()
  })

  it('honeypot: éxito silencioso, nada escrito', async () => {
    const { save, log } = setup()

    expect(await save(TOKEN, validFormInput(), 'spam', CONTEXT)).toEqual({
      ok: true,
    })
    expect(log).toEqual([])
  })

  it('límites por IP y por token', async () => {
    for (const key of ['formSaveByIp', 'formSaveByToken'] as const) {
      const { save, log } = setup(openLimiters({ [key]: limiter(0) }))

      expect(await save(TOKEN, validFormInput(), '', CONTEXT)).toEqual({
        ok: false,
        reason: 'rate_limited',
      })
      expect(log).toEqual([])
    }
  })

  it('no cuenta en el limitador de tokens las cadenas que no son tokens', async () => {
    const limiters = openLimiters()
    const { save } = setup(limiters)

    await save('<script>', validFormInput(), '', CONTEXT)

    expect(limiters.formSaveByToken).toMatchObject({ calls: [] })
  })
})
