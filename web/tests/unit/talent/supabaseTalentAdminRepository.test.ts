import { beforeEach, describe, expect, it, vi } from 'vitest'

type Result = {
  data?: unknown
  error?: { message: string; code?: string } | null
  count?: number | null
}
type Call = { table: string; steps: [string, unknown[]][] }

const calls: Call[] = []
const queues = new Map<string, Result[]>()

/**
 * Cliente de Supabase falso y encadenable (mismo patrón que
 * `supabaseTalentRepository.test.ts`): anota los pasos de cada consulta y, al
 * esperarla, devuelve el siguiente resultado programado para `tabla.verbo`.
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
            resolve({ data: null, error: null, count: null, ...result })
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

const { supabaseTalentAdminRepository: repository } =
  await import('@/modules/talent/infrastructure/supabaseTalentAdminRepository')

const baseQuery = {
  q: '',
  status: '',
  profile: '',
  page: 1,
  pageSize: 25,
}

describe('search', () => {
  it('pide solo columnas seguras: nunca el access_token', async () => {
    await repository.search(baseQuery)

    const [columns] = stepsOf(0).select as [string]

    expect(columns).not.toContain('access_token')
    expect(columns).not.toContain('*')
  })

  it('ordena por fecha descendente (las filas sin fecha al final) y pagina', async () => {
    await repository.search({ ...baseQuery, page: 3 })

    const steps = stepsOf(0)

    expect(calls[0].steps.filter(([name]) => name === 'order')).toEqual([
      ['order', ['created_at', { ascending: false, nullsFirst: false }]],
      ['order', ['id', { ascending: false }]],
    ])
    expect(steps.range).toEqual([50, 74])
  })

  it('el texto busca en nombre y email con ilike', async () => {
    await repository.search({ ...baseQuery, q: 'ada' })

    expect(stepsOf(0).or).toEqual(['name.ilike.%ada%,email.ilike.%ada%'])
  })

  it('filtra por estado exacto y por perfil dentro del array', async () => {
    await repository.search({ ...baseQuery, status: 'error', profile: 'video' })

    const steps = stepsOf(0)

    expect(steps.eq).toEqual(['status', 'error'])
    expect(steps.contains).toEqual(['profile', ['video']])
  })

  it('cuenta los ficheros de la página con una consulta aparte (sin embeber files)', async () => {
    program('candidates.select', {
      data: [
        {
          id: 'c1',
          name: 'Ada',
          email: 'ada@example.com',
          status: 'closed',
          profile: ['diseno'],
          file_path: 'https://drive.google.com/file/d/x/view',
          uploaded_by: null,
          created_at: '2026-06-01T10:00:00Z',
        },
        {
          id: 'c2',
          name: null,
          email: null,
          status: 'pending',
          profile: null,
          file_path: 'uploads/abc.pdf',
          uploaded_by: 'ana@itsgreener.com',
          created_at: null,
        },
      ],
      count: 1018,
    })
    program('files.select', {
      data: [{ candidate_id: 'c1' }, { candidate_id: 'c1' }],
    })

    const result = await repository.search(baseQuery)

    expect(result.total).toBe(1018)
    expect(result.items).toEqual([
      {
        id: 'c1',
        name: 'Ada',
        email: 'ada@example.com',
        status: 'closed',
        profile: ['diseno'],
        cvKind: 'drive',
        filesCount: 2,
        uploadedBy: null,
        createdAt: '2026-06-01T10:00:00Z',
      },
      {
        id: 'c2',
        name: null,
        email: null,
        status: 'pending',
        profile: [],
        cvKind: 'bucket',
        filesCount: 0,
        uploadedBy: 'ana@itsgreener.com',
        createdAt: null,
      },
    ])
    expect(calls[1].table).toBe('files')
    expect(stepsOf(1).in).toEqual(['candidate_id', ['c1', 'c2']])
  })

  it('sin resultados no consulta files', async () => {
    program('candidates.select', { data: [], count: 0 })

    expect(await repository.search(baseQuery)).toEqual({ items: [], total: 0 })
    expect(calls).toHaveLength(1)
  })

  it('un error de la base se lanza con el nombre de la operación', async () => {
    program('candidates.select', { error: { message: 'boom' } })

    await expect(repository.search(baseQuery)).rejects.toThrow(
      'Supabase-talent (candidates.search): boom',
    )
  })
})

describe('findDetail', () => {
  const row = {
    id: 'c1',
    created_at: '2026-06-01T10:00:00Z',
    status: 'closed',
    name: 'Ada',
    email: 'ada@example.com',
    phone: '+34 600',
    comment: 'hola',
    ai_comment: 'buen perfil',
    profile: ['diseno'],
    experience: '5-10',
    work_types: ['freelance'],
    rate_day: 300,
    rate_hour: null,
    languages: { English: 'avanzado' },
    socials: { LinkedIn: 'https://linkedin.com/in/ada' },
    newsletter_accepted: true,
    uploaded_by: 'ana@itsgreener.com',
    blocked: null,
    file_path: 'uploads/abc.pdf',
    file_name: 'resume-ada.pdf',
  }

  it('devuelve el candidato con proyectos y ficheros, sin rutas ni token', async () => {
    program('candidates.select', { data: [row] })
    program('projects.select', {
      data: [{ link: 'https://ada.example', comment: null }],
    })
    program('files.select', {
      data: [
        {
          id: 'f1',
          type: 'portfolio',
          path: 'https://drive.google.com/file/d/f/view',
          status: 'processed',
          created_at: null,
        },
      ],
    })

    const detail = await repository.findDetail('c1')

    expect(detail).toMatchObject({
      id: 'c1',
      name: 'Ada',
      cvKind: 'bucket',
      cvName: 'resume-ada.pdf',
      workTypes: ['freelance'],
      rateDay: 300,
      languages: { English: 'avanzado' },
      projects: [{ link: 'https://ada.example', comment: null }],
      files: [
        {
          id: 'f1',
          type: 'portfolio',
          status: 'processed',
          kind: 'drive',
          createdAt: null,
        },
      ],
    })
    expect(JSON.stringify(detail)).not.toContain('drive.google.com/file/d/f')
    expect(JSON.stringify(detail)).not.toContain('uploads/abc.pdf')
    expect(stepsOf(0).select[0]).not.toContain('access_token')
  })

  it('las columnas nulas se normalizan: arrays y objetos nunca null', async () => {
    program('candidates.select', {
      data: [
        {
          ...row,
          profile: null,
          work_types: null,
          languages: null,
          socials: null,
          file_path: null,
        },
      ],
    })

    expect(await repository.findDetail('c1')).toMatchObject({
      profile: [],
      workTypes: [],
      languages: {},
      socials: {},
      cvKind: 'none',
    })
  })

  it('un candidato que no existe es null', async () => {
    program('candidates.select', { data: [] })

    expect(await repository.findDetail('nada')).toBeNull()
  })
})

describe('countByStatus', () => {
  it('hace un recuento por estado, sin traer filas (el máximo de la API es 1.000)', async () => {
    program(
      'candidates.select',
      { count: 4 },
      { count: 23 },
      { count: 0 },
      { count: 914 },
      { count: 3 },
      { count: 19 },
      { count: 62 },
    )

    const counts = await repository.countByStatus()

    expect(counts).toEqual({
      pending: 4,
      started: 23,
      processed: 0,
      sent: 914,
      completed: 3,
      closed: 19,
      error: 62,
    })
    expect(calls).toHaveLength(7)
    expect(stepsOf(0).select).toEqual(['id', { count: 'exact', head: true }])
  })
})

describe('findStoredPath', () => {
  it('sin fichero lee file_path del candidato', async () => {
    program('candidates.select', { data: [{ file_path: 'uploads/abc.pdf' }] })

    expect(await repository.findStoredPath('c1', null)).toBe('uploads/abc.pdf')
    expect(calls[0].table).toBe('candidates')
    expect(stepsOf(0).eq).toEqual(['id', 'c1'])
  })

  it('con fichero lee path de files y exige que sea del candidato', async () => {
    program('files.select', { data: [{ path: 'https://drive.google.com/x' }] })

    expect(await repository.findStoredPath('c1', 'f1')).toBe(
      'https://drive.google.com/x',
    )
    expect(calls[0].steps.filter(([name]) => name === 'eq')).toEqual([
      ['eq', ['id', 'f1']],
      ['eq', ['candidate_id', 'c1']],
    ])
  })

  it('sin fila o sin ruta, null', async () => {
    program('candidates.select', { data: [] }, { data: [{ file_path: null }] })

    expect(await repository.findStoredPath('c1', null)).toBeNull()
    expect(await repository.findStoredPath('c1', null)).toBeNull()
  })
})

describe('insertStaffCandidate', () => {
  it('inserta exactamente la fila y devuelve su id', async () => {
    program('candidates.insert', { data: { id: 'new-1' } })
    const row = {
      status: 'pending' as const,
      file_path: 'uploads/abc.pdf',
      uploaded_by: 'ana@itsgreener.com',
    }

    expect(await repository.insertStaffCandidate(row)).toEqual({ id: 'new-1' })
    expect(stepsOf(0).insert).toEqual([row])
  })

  it('un error de la base se lanza', async () => {
    program('candidates.insert', { error: { message: 'boom' } })

    await expect(
      repository.insertStaffCandidate({
        status: 'pending',
        file_path: 'uploads/a.pdf',
        uploaded_by: 'ana@itsgreener.com',
      }),
    ).rejects.toThrow('Supabase-talent (candidates.insertStaff): boom')
  })
})

describe('requeueForProcessing', () => {
  it('solo cambia filas started o error cuyo CV sigue en el bucket', async () => {
    program('candidates.update', { data: [{ id: 'c1' }] })

    expect(await repository.requeueForProcessing('c1')).toBe(true)

    const steps = stepsOf(0)

    expect(steps.update).toEqual([{ status: 'pending' }])
    expect(steps.eq).toEqual(['id', 'c1'])
    expect(steps.in).toEqual(['status', ['started', 'error']])
    expect(steps.like).toEqual(['file_path', 'uploads/%'])
  })

  it('si ninguna fila cumple, false', async () => {
    program('candidates.update', { data: [] })

    expect(await repository.requeueForProcessing('c1')).toBe(false)
  })
})

describe('findAccessById / setAccessToken', () => {
  it('lee el acceso (con token) y lo mapea', async () => {
    program('candidates.select', {
      data: [{ id: 'c1', email: 'a@x.com', status: 'sent', access_token: 't' }],
    })

    expect(await repository.findAccessById('c1')).toEqual({
      id: 'c1',
      email: 'a@x.com',
      status: 'sent',
      accessToken: 't',
    })
  })

  it('un id que no existe es null', async () => {
    program('candidates.select', { data: [] })

    expect(await repository.findAccessById('c1')).toBeNull()
  })

  it('guarda el token nuevo', async () => {
    await repository.setAccessToken('c1', 'tok')

    expect(stepsOf(0).update).toEqual([
      { access_token: 'tok', access_token_expires_at: expect.any(String) },
    ])
    expect(stepsOf(0).eq).toEqual(['id', 'c1'])
  })
})

describe('findDeletionTarget', () => {
  it('reúne las rutas del bucket (sin repetir) y cuenta las que no lo son', async () => {
    program('candidates.select', {
      data: [
        {
          id: 'c1',
          file_path: 'uploads/cv.pdf',
          newsletter_accepted: true,
          created_at: '2024-05-01T09:30:00.123456',
        },
      ],
    })
    program('files.select', {
      data: [
        { path: 'uploads/cv.pdf' },
        { path: 'uploads/portfolio.png' },
        { path: 'https://drive.google.com/file/d/abc/view' },
        { path: null },
        { path: '  ' },
      ],
    })

    expect(await repository.findDeletionTarget('c1')).toEqual({
      id: 'c1',
      bucketPaths: ['uploads/cv.pdf', 'uploads/portfolio.png'],
      externalPaths: ['https://drive.google.com/file/d/abc/view'],
      newsletterAccepted: true,
      createdAt: '2024-05-01T09:30:00.123456',
    })
    expect(stepsOf(0).eq).toEqual(['id', 'c1'])
    expect(stepsOf(1).eq).toEqual(['candidate_id', 'c1'])
  })

  it('un CV ya en Drive cuenta como externo y newsletter null es false', async () => {
    program('candidates.select', {
      data: [
        {
          id: 'c1',
          file_path: 'https://drive.google.com/file/d/x/view',
          newsletter_accepted: null,
        },
      ],
    })
    program('files.select', { data: [] })

    expect(await repository.findDeletionTarget('c1')).toEqual({
      id: 'c1',
      bucketPaths: [],
      externalPaths: ['https://drive.google.com/file/d/x/view'],
      newsletterAccepted: false,
      createdAt: null,
    })
  })

  it('un candidato que no existe es null y no consulta ficheros', async () => {
    program('candidates.select', { data: [] })

    expect(await repository.findDeletionTarget('c1')).toBeNull()
    expect(calls).toHaveLength(1)
  })

  it('ignora una ruta del bucket con ..: no se borraría nada fuera de uploads/', async () => {
    program('candidates.select', {
      data: [
        { id: 'c1', file_path: 'uploads/../otro', newsletter_accepted: false },
      ],
    })
    program('files.select', { data: [] })

    const target = await repository.findDeletionTarget('c1')

    expect(target?.bucketPaths).toEqual([])
    expect(target?.externalPaths).toEqual(['uploads/../otro'])
  })
})

describe('deleteCandidateRows', () => {
  it('borra primero proyectos, luego ficheros y al final el candidato', async () => {
    await repository.deleteCandidateRows('c1')

    expect(calls.map((call) => call.table)).toEqual([
      'projects',
      'files',
      'candidates',
    ])
    expect(calls.map((call) => call.steps[0][0])).toEqual([
      'delete',
      'delete',
      'delete',
    ])
    expect(stepsOf(0).eq).toEqual(['candidate_id', 'c1'])
    expect(stepsOf(1).eq).toEqual(['candidate_id', 'c1'])
    expect(stepsOf(2).eq).toEqual(['id', 'c1'])
  })

  it('si falla un borrado no sigue con el siguiente', async () => {
    program('projects.delete', { error: { message: 'boom' } })

    await expect(repository.deleteCandidateRows('c1')).rejects.toThrow(
      'projects.delete',
    )
    expect(calls).toHaveLength(1)
  })
})

describe('listExpiredCandidateIds', () => {
  const NOW = new Date('2026-10-20T10:00:00Z')

  it('pide los creados antes de hace 2 años, los más antiguos primero', async () => {
    program('candidates.select', { data: [{ id: 'c1' }, { id: 'c2' }] })

    expect(await repository.listExpiredCandidateIds(NOW, 51)).toEqual([
      'c1',
      'c2',
    ])
    expect(stepsOf(0).select).toEqual(['id'])
    expect(stepsOf(0).or).toEqual(['created_at.lt.2024-10-20T10:00:00.000Z'])
    expect(stepsOf(0).limit).toEqual([51])
  })

  it('las filas sin fecha solo entran a partir del 20 de octubre de 2027', async () => {
    await repository.listExpiredCandidateIds(NOW, 10)
    await repository.listExpiredCandidateIds(
      new Date('2027-10-20T00:00:00Z'),
      10,
    )

    expect(stepsOf(0).or).not.toEqual([expect.stringContaining('is.null')])
    expect(stepsOf(1).or).toEqual([
      'created_at.lt.2025-10-20T00:00:00.000Z,created_at.is.null',
    ])
  })

  it('si falla la consulta lanza', async () => {
    program('candidates.select', { error: { message: 'boom' } })

    await expect(repository.listExpiredCandidateIds(NOW, 10)).rejects.toThrow(
      'candidates.listExpired',
    )
  })
})
