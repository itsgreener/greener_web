import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeSaveCandidateForm } from '@/modules/talent/application/saveCandidateForm'
import { DuplicateCandidateEmailError } from '@/modules/talent/domain/talentErrors'
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

  it('escribe status = completed, el email del formulario y no toca el nombre', async () => {
    const { save, updates } = setup()

    await save(TOKEN, validFormInput(), '', CONTEXT)

    expect(updates[0].row).toMatchObject({
      status: 'completed',
      email: 'ada@example.com',
    })
    expect(updates[0].row).not.toHaveProperty('name')
  })

  it('da de alta en la newsletter con el email del formulario', async () => {
    const { save, subscribe } = setup()

    await save(
      TOKEN,
      validFormInput({ email: 'nuevo@example.com' }),
      '',
      CONTEXT,
    )

    expect(subscribe).toHaveBeenCalledExactlyOnceWith('nuevo@example.com')
  })

  it('permite cambiar el email a uno libre', async () => {
    const { save, updates } = setup()

    expect(
      await save(
        TOKEN,
        validFormInput({ email: 'nuevo@example.com' }),
        '',
        CONTEXT,
      ),
    ).toEqual({ ok: true })
    expect(updates[0].row.email).toBe('nuevo@example.com')
  })

  it('no permite quedarse con el email de otro candidato: email_taken, sin escribir', async () => {
    const repo = fakeRepository([
      CANDIDATE,
      {
        id: 'c2',
        email: 'otra@example.com',
        status: 'closed',
        accessToken: 'x'.repeat(20),
      },
    ])
    const { workflows, processCandidate } = fakeWorkflows()
    const { newsletter, subscribe } = fakeNewsletter()
    const save = makeSaveCandidateForm({
      repository: repo.repository,
      workflows,
      newsletter,
      limiters: openLimiters(),
    })

    expect(
      await save(
        TOKEN,
        validFormInput({ email: 'Otra@Example.com' }),
        '',
        CONTEXT,
      ),
    ).toEqual({ ok: false, reason: 'email_taken' })
    expect(repo.updates).toEqual([])
    expect(subscribe).not.toHaveBeenCalled()
    expect(processCandidate).not.toHaveBeenCalled()
  })

  it('si el índice único salta en la carrera, también es email_taken', async () => {
    const repo = fakeRepository([CANDIDATE])
    repo.repository.updateCandidate = async () => {
      throw new DuplicateCandidateEmailError()
    }
    const { workflows } = fakeWorkflows()
    const { newsletter } = fakeNewsletter()
    const save = makeSaveCandidateForm({
      repository: repo.repository,
      workflows,
      newsletter,
      limiters: openLimiters(),
    })

    expect(
      await save(
        TOKEN,
        validFormInput({ email: 'nuevo@example.com' }),
        '',
        CONTEXT,
      ),
    ).toEqual({ ok: false, reason: 'email_taken' })
  })

  it('con el mismo email (aunque cambien las mayúsculas) no se consulta la base', async () => {
    const { save, log } = setup()

    await save(TOKEN, validFormInput({ email: 'ADA@example.com' }), '', CONTEXT)

    expect(log).not.toContain('findByEmail')
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
