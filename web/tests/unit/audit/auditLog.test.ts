import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AUDIT_LOG_PAGE_SIZE,
  auditLogPageCount,
  parseAuditLogQuery,
} from '@/modules/audit/domain/auditLogQuery'
import { makeListAuditLog } from '@/modules/audit/application/listAuditLog'

const ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

describe('parseAuditLogQuery', () => {
  it('valores por defecto: sin filtros, página 1', () => {
    expect(parseAuditLogQuery({})).toEqual({
      q: '',
      entity: '',
      entityId: '',
      page: 1,
      pageSize: AUDIT_LOG_PAGE_SIZE,
    })
  })

  it('sanea el texto: quita los caracteres con significado en ilike y en or()', () => {
    expect(parseAuditLogQuery({ q: '  a%b_c,(d)*"e\\  f ' }).q).toBe(
      'a b c d e f',
    )
    expect(parseAuditLogQuery({ q: 'x'.repeat(300) }).q).toHaveLength(100)
  })

  it('la entidad solo admite a-z y guion bajo; lo demás se ignora', () => {
    expect(parseAuditLogQuery({ entity: 'Media_Asset' }).entity).toBe(
      'media_asset',
    )
    expect(parseAuditLogQuery({ entity: "content'; drop" }).entity).toBe('')
    expect(parseAuditLogQuery({ entity: 'a'.repeat(80) }).entity).toBe('')
  })

  it('el id de entidad tiene que ser un uuid', () => {
    expect(parseAuditLogQuery({ entityId: ID }).entityId).toBe(ID)
    expect(parseAuditLogQuery({ entityId: 'no-es-uuid' }).entityId).toBe('')
  })

  it('la página inválida vuelve a la 1', () => {
    expect(parseAuditLogQuery({ page: '3' }).page).toBe(3)
    expect(parseAuditLogQuery({ page: '-2' }).page).toBe(1)
    expect(parseAuditLogQuery({ page: 'abc' }).page).toBe(1)
  })

  it('cuenta las páginas con un mínimo de 1', () => {
    expect(auditLogPageCount(0, 50)).toBe(1)
    expect(auditLogPageCount(50, 50)).toBe(1)
    expect(auditLogPageCount(51, 50)).toBe(2)
  })
})

describe('listAuditLog', () => {
  it('delega en el repositorio, que solo tiene lectura', async () => {
    const audit = {
      list: vi.fn(async () => ({ items: [], total: 0 })),
    }
    const query = parseAuditLogQuery({ q: 'publish' })

    await expect(makeListAuditLog({ audit })(query)).resolves.toEqual({
      items: [],
      total: 0,
    })

    expect(audit.list).toHaveBeenCalledWith(query)
    expect(Object.keys(audit)).toEqual(['list'])
  })
})

// --- repositorio de Supabase -------------------------------------------

const result = vi.hoisted(() => ({
  value: { data: [] as unknown[], error: null as unknown, count: 0 },
}))
const calls = vi.hoisted(() => ({
  eq: [] as unknown[][],
  or: [] as unknown[][],
  range: [] as unknown[][],
  order: [] as unknown[][],
  select: [] as unknown[][],
  from: [] as unknown[][],
}))

vi.mock('@/lib/supabase/server', () => {
  const builder: Record<string, unknown> = {}
  const chain = (name: keyof typeof calls) =>
    vi.fn((...args: unknown[]) => {
      calls[name].push(args)

      return builder
    })

  Object.assign(builder, {
    select: chain('select'),
    order: chain('order'),
    range: chain('range'),
    eq: chain('eq'),
    or: chain('or'),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result.value).then(resolve),
  })

  return {
    createClient: async () => ({
      from: (...args: unknown[]) => {
        calls.from.push(args)

        return builder
      },
    }),
  }
})

import { supabaseAuditLogRepository } from '@/modules/audit/infrastructure/supabaseAuditLogRepository'

describe('supabaseAuditLogRepository', () => {
  beforeEach(() => {
    for (const key of Object.keys(calls) as (keyof typeof calls)[]) {
      calls[key].length = 0
    }
    result.value = { data: [], error: null, count: 0 }
  })

  it('lee audit_log, lo más reciente primero, y mapea las filas', async () => {
    result.value = {
      data: [
        {
          id: 'a1',
          actor_email: 'ana@greener.com',
          action: 'publish',
          entity: 'content',
          entity_id: ID,
          payload: { previous_status: 'draft' },
          created_at: '2026-10-16T09:00:00Z',
        },
      ],
      error: null,
      count: 120,
    }

    const page = await supabaseAuditLogRepository.list(parseAuditLogQuery({}))

    expect(calls.from).toEqual([['audit_log']])
    expect(calls.order[0]).toEqual(['created_at', { ascending: false }])
    expect(calls.range[0]).toEqual([0, 49])
    expect(page.total).toBe(120)
    expect(page.items).toEqual([
      {
        id: 'a1',
        actorEmail: 'ana@greener.com',
        action: 'publish',
        entity: 'content',
        entityId: ID,
        payload: { previous_status: 'draft' },
        createdAt: '2026-10-16T09:00:00Z',
      },
    ])
  })

  it('aplica los filtros y la página', async () => {
    await supabaseAuditLogRepository.list(
      parseAuditLogQuery({ q: 'ana', entity: 'pin', entityId: ID, page: '3' }),
    )

    expect(calls.eq).toEqual([
      ['entity', 'pin'],
      ['entity_id', ID],
    ])
    expect(calls.or[0]?.[0]).toBe('actor_email.ilike.%ana%,action.ilike.%ana%')
    expect(calls.range[0]).toEqual([100, 149])
  })

  it('un error de la base se propaga como error de repositorio', async () => {
    result.value = {
      data: [],
      error: { message: 'denied', code: '42501' },
      count: 0,
    }

    await expect(
      supabaseAuditLogRepository.list(parseAuditLogQuery({})),
    ).rejects.toBeTruthy()
  })
})
