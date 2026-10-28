import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DuplicateCandidateEmailError } from '@/modules/talent/domain/talentErrors'

type Result = {
  data?: unknown
  error?: { message: string; code?: string } | null
}
type Call = { table: string; steps: [string, unknown[]][] }

const calls: Call[] = []
const queues = new Map<string, Result[]>()

/**
 * Cliente de Supabase falso y encadenable: cada `from(tabla)` anota los pasos
 * (`select`, `eq`, `ilike`…) y, al esperarlo, devuelve el siguiente resultado
 * programado para `tabla.primerPaso`.
 */
function query(table: string) {
  const call: Call = { table, steps: [] }
  calls.push(call)

  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, name: string) {
        if (name === 'then') {
          const verb = call.steps[0]?.[0] ?? 'select'
          const result = queues.get(`${table}.${verb}`)?.shift() ?? { data: [] }

          return (resolve: (value: unknown) => void) =>
            resolve({ data: null, error: null, ...result })
        }

        return (...args: unknown[]) => {
          call.steps.push([name, args])

          return proxy
        }
      },
    },
  )

  return proxy
}

vi.mock('@/modules/talent/infrastructure/talentSupabaseClient', () => ({
  getTalentClient: () => ({ from: query }),
}))

function program(key: string, ...results: Result[]) {
  queues.set(key, results)
}

function stepsOf(index: number) {
  return Object.fromEntries(
    calls[index].steps.map(([name, args]) => [name, args]),
  )
}

beforeEach(() => {
  calls.length = 0
  queues.clear()
})

const { supabaseTalentRepository: repository, escapeLikePattern } =
  await import('@/modules/talent/infrastructure/supabaseTalentRepository')

describe('escapeLikePattern', () => {
  it('escapa los comodines de ilike: _ y % son corrientes en un email', () => {
    expect(escapeLikePattern('a_b%c\\d@x.com')).toBe('a\\_b\\%c\\\\d@x.com')
  })
})

describe('findByEmail', () => {
  it('busca sin distinguir mayúsculas y con el email escapado', async () => {
    program('candidates.select', {
      data: [
        { id: 'c1', email: 'a_b@x.com', status: 'sent', access_token: 't' },
      ],
    })

    const found = await repository.findByEmail('a_b@x.com')

    expect(stepsOf(0).ilike).toEqual(['email', 'a\\_b@x.com'])
    expect(found).toEqual({
      id: 'c1',
      email: 'a_b@x.com',
      status: 'sent',
      accessToken: 't',
    })
  })

  it('sin filas: null', async () => {
    program('candidates.select', { data: [] })

    expect(await repository.findByEmail('a@b.co')).toBeNull()
  })

  it('un error de la base se propaga (no se confunde con "no existe")', async () => {
    program('candidates.select', { error: { message: 'boom' } })

    await expect(repository.findByEmail('a@b.co')).rejects.toThrow(/boom/)
  })
})

describe('insertCandidate', () => {
  it('inserta la fila tal cual y devuelve el id', async () => {
    program('candidates.insert', { data: { id: 'nuevo' } })
    const row = {
      email: 'a@b.co',
      status: 'processed' as const,
      access_token: 't',
      access_token_expires_at: '2026-11-04T10:00:00.000Z',
    }

    expect(await repository.insertCandidate(row)).toEqual({ id: 'nuevo' })
    expect(stepsOf(0).insert).toEqual([row])
  })

  it('el índice único (23505) se traduce a error de dominio, sin texto de Postgres', async () => {
    program('candidates.insert', {
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      },
    })

    const error = await repository
      .insertCandidate({
        email: 'a@b.co',
        status: 'processed',
        access_token: 't',
        access_token_expires_at: '2026-11-04T10:00:00.000Z',
      })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(DuplicateCandidateEmailError)
    expect((error as Error).message).not.toMatch(/duplicate key/)
  })
})

describe('updateCandidate', () => {
  const row = {
    email: 'a@b.co',
    status: 'completed' as const,
    phone: null,
    comment: null,
    profile: ['diseno'],
    experience: null,
    work_types: [],
    rate_day: null,
    rate_hour: null,
    languages: {},
    socials: {},
    newsletter_accepted: false,
  }

  it('actualiza la fila del candidato con lo recibido', async () => {
    program('candidates.update', { data: null })

    await repository.updateCandidate('c1', row)

    expect(stepsOf(0).update).toEqual([row])
    expect(stepsOf(0).eq).toEqual(['id', 'c1'])
  })

  it('cambiar el email a uno que ya existe (23505) es error de dominio', async () => {
    program('candidates.update', {
      error: { code: '23505', message: 'duplicate key value' },
    })

    const error = await repository
      .updateCandidate('c1', row)
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(DuplicateCandidateEmailError)
    expect((error as Error).message).not.toMatch(/duplicate key/)
  })

  it('cualquier otro error de la base se propaga', async () => {
    program('candidates.update', { error: { message: 'boom' } })

    await expect(repository.updateCandidate('c1', row)).rejects.toThrow(/boom/)
  })
})

describe('findFormByToken', () => {
  it('lee solo las columnas del formulario (nunca select *)', async () => {
    program('candidates.select', {
      data: [
        {
          id: 'c1',
          email: 'a@b.co',
          work_types: ['x'],
          rate_day: 5,
          newsletter_accepted: true,
        },
      ],
    })
    program('projects.select', {
      data: [{ link: 'https://a.example', comment: null }],
    })
    program('files.select', {
      data: [{ id: 'f1', path: 'uploads/a.pdf', status: 'pending' }],
    })

    const record = await repository.findFormByToken('token')

    const columns = String(stepsOf(0).select?.[0])

    expect(columns).not.toBe('*')
    expect(String(stepsOf(0).or?.[0])).toContain(
      'access_token_expires_at.is.null',
    )
    expect(String(stepsOf(0).or?.[0])).toContain('access_token_expires_at.gt.')
    for (const secret of [
      'access_token',
      'status',
      'ai_comment',
      'file_path',
      'uploaded_by',
    ]) {
      expect(columns).not.toContain(secret)
    }
    expect(record).toMatchObject({
      id: 'c1',
      workTypes: ['x'],
      rateDay: 5,
      newsletterAccepted: true,
      projects: [{ link: 'https://a.example', comment: null }],
      files: [{ id: 'f1', path: 'uploads/a.pdf', status: 'pending' }],
    })
  })

  it('token sin candidato: null y no consulta proyectos ni ficheros', async () => {
    program('candidates.select', { data: [] })

    expect(await repository.findFormByToken('token')).toBeNull()
    expect(calls).toHaveLength(1)
  })
})

describe('replaceProjects', () => {
  it('inserta los nuevos ANTES de borrar los antiguos (nunca deja cero proyectos)', async () => {
    program('projects.select', { data: [{ id: 'old1' }, { id: 'old2' }] })
    const rows = [
      {
        candidate_id: 'c1',
        link: 'https://a.example',
        comment: null,
        access_token: 't',
      },
    ]

    await repository.replaceProjects('c1', rows)

    expect(calls.map((call) => call.steps[0][0])).toEqual([
      'select',
      'insert',
      'delete',
    ])
    expect(stepsOf(1).insert).toEqual([rows])
    expect(stepsOf(2).in).toEqual(['id', ['old1', 'old2']])
  })

  it('si falla la inserción, no borra los que había', async () => {
    program('projects.select', { data: [{ id: 'old1' }] })
    program('projects.insert', { error: { message: 'fallo' } })

    await expect(repository.replaceProjects('c1', [])).rejects.toThrow(/fallo/)
    expect(calls.map((call) => call.steps[0][0])).not.toContain('delete')
  })

  it('sin proyectos previos no borra nada', async () => {
    program('projects.select', { data: [] })

    await repository.replaceProjects('c1', [])

    expect(calls.map((call) => call.steps[0][0])).toEqual(['select', 'insert'])
  })
})

describe('ficheros', () => {
  it('solo cuenta los pending del candidato', async () => {
    program('files.select', { data: [] })

    await repository.listPendingFiles('c1')

    expect(stepsOf(0).eq).toBeDefined()
    expect(
      calls[0].steps.filter(([name]) => name === 'eq').map(([, args]) => args),
    ).toEqual([
      ['candidate_id', 'c1'],
      ['status', 'pending'],
    ])
  })

  it('findPendingFile y deleteFile filtran también por candidato', async () => {
    program('files.select', {
      data: [{ id: 'f1', path: 'uploads/a.pdf', status: 'pending' }],
    })

    await repository.findPendingFile('c1', 'f1')
    await repository.deleteFile('c1', 'f1')

    const filters = (index: number) =>
      calls[index].steps
        .filter(([name]) => name === 'eq')
        .map(([, args]) => args)

    expect(filters(0)).toContainEqual(['candidate_id', 'c1'])
    expect(filters(1)).toEqual([
      ['id', 'f1'],
      ['candidate_id', 'c1'],
    ])
  })
})

describe('caducidad del enlace personal (SEC-PUB-C2)', () => {
  it('findAccessByToken solo devuelve enlaces sin fecha o con la fecha en el futuro', async () => {
    program('candidates.select', { data: [] })

    expect(await repository.findAccessByToken('token')).toBeNull()

    const filter = String(stepsOf(0).or?.[0])

    expect(filter).toMatch(
      /^access_token_expires_at\.is\.null,access_token_expires_at\.gt\.\d{4}-\d{2}-\d{2}T/,
    )
  })

  it('setAccessToken guarda el token y abre una semana nueva', async () => {
    const before = Date.now()

    await repository.setAccessToken('c1', 'tok')

    const [update] = stepsOf(0).update as [
      { access_token: string; access_token_expires_at: string },
    ]
    const expires = Date.parse(update.access_token_expires_at)

    expect(update.access_token).toBe('tok')
    expect(expires).toBeGreaterThanOrEqual(before + 7 * 24 * 3600 * 1000)
    expect(expires).toBeLessThan(before + 7 * 24 * 3600 * 1000 + 60_000)
  })
})
