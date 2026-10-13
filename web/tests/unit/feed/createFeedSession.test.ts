import { describe, it, expect, vi } from 'vitest'
import { makeCreateFeedSession } from '@/modules/feed/application/createFeedSession'
import { UnsupportedScopeError } from '@/modules/feed/domain/feedErrors'
import type { FeedSession } from '@/modules/feed/domain/feedPorts'

/** El caso de uso sobre un repositorio de sesiones falso. */
function build(create: ReturnType<typeof vi.fn>) {
  return makeCreateFeedSession({
    sessions: {
      create: (params) =>
        (create as (input: unknown) => Promise<FeedSession>)(params),
    },
  })
}

function fakeRow(overrides: Partial<FeedSession> = {}): FeedSession {
  return {
    id: 'session-1',
    seed: 'seed-1',
    scope: 'home',
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    excludeContentId: null,
    ...overrides,
  }
}

describe('createFeedSession', () => {
  it("crea la sesión para scope 'home' y devuelve su id", async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    const result = await build(createRow)({ scope: 'home' })

    expect(result.sessionId).toBe('session-1')
    expect(createRow).toHaveBeenCalledWith({ scope: 'home', filterHash: null })
  })

  it.each(['work', 'insights', 'tools', 'channel'])(
    "acepta el scope de subhome '%s' (arquitectura §8.2, ya no solo 'home')",
    async (scope) => {
      const createRow = vi.fn().mockResolvedValue(fakeRow({ scope }))

      const result = await build(createRow)({ scope })

      expect(result.sessionId).toBe('session-1')
      expect(createRow).toHaveBeenCalledWith({ scope, filterHash: null })
    },
  )

  it('rechaza un scope todavía no soportado sin llegar a Supabase', async () => {
    const createRow = vi.fn()

    await expect(build(createRow)({ scope: 'related-cases' })).rejects.toThrow(
      UnsupportedScopeError,
    )
    expect(createRow).not.toHaveBeenCalled()
  })

  it('calcula el mismo filterHash sin importar el orden de las claves del filtro', async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    await build(createRow)({
      scope: 'home',
      filter: { tag: 'branding', lang: 'es' },
    })
    const firstHash = createRow.mock.calls[0][0].filterHash

    createRow.mockClear()
    await build(createRow)({
      scope: 'home',
      filter: { lang: 'es', tag: 'branding' },
    })
    const secondHash = createRow.mock.calls[0][0].filterHash

    expect(firstHash).toBe(secondHash)
    expect(firstHash).not.toBeNull()
  })

  it('sin filtro, filterHash es null (no una cadena vacía con hash)', async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    await build(createRow)({ scope: 'home' })

    expect(createRow).toHaveBeenCalledWith({ scope: 'home', filterHash: null })
  })

  it('panel de recomendaciones (especificacion-final-formato-detalle.md §1, §6): pasa excludeContentId al repositorio', async () => {
    const createRow = vi
      .fn()
      .mockResolvedValue(fakeRow({ excludeContentId: 'content-123' }))

    await build(createRow)({ scope: 'home', excludeContentId: 'content-123' })

    expect(createRow).toHaveBeenCalledWith({
      scope: 'home',
      filterHash: null,
      excludeContentId: 'content-123',
    })
  })

  it('sin excludeContentId, no se manda (sesión normal de home/subhome, sin exclusión)', async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    await build(createRow)({ scope: 'home' })

    expect(createRow).toHaveBeenCalledWith({
      scope: 'home',
      filterHash: null,
      excludeContentId: undefined,
    })
  })
})
