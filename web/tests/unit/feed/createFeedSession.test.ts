import { describe, it, expect, vi } from 'vitest'
import {
  createFeedSession,
  UnsupportedScopeError,
} from '@/modules/feed/application/createFeedSession'
import type { FeedSessionRow } from '@/modules/feed/infrastructure/feedSessionRepository'

function fakeRow(overrides: Partial<FeedSessionRow> = {}): FeedSessionRow {
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

    const result = await createFeedSession({ scope: 'home' }, createRow)

    expect(result.sessionId).toBe('session-1')
    expect(createRow).toHaveBeenCalledWith({ scope: 'home', filterHash: null })
  })

  it.each(['work', 'insights', 'tools', 'channel'])(
    "acepta el scope de subhome '%s' (arquitectura §8.2, ya no solo 'home')",
    async (scope) => {
      const createRow = vi.fn().mockResolvedValue(fakeRow({ scope }))

      const result = await createFeedSession({ scope }, createRow)

      expect(result.sessionId).toBe('session-1')
      expect(createRow).toHaveBeenCalledWith({ scope, filterHash: null })
    },
  )

  it('rechaza un scope todavía no soportado sin llegar a Supabase', async () => {
    const createRow = vi.fn()

    await expect(
      createFeedSession({ scope: 'related-cases' }, createRow),
    ).rejects.toThrow(UnsupportedScopeError)
    expect(createRow).not.toHaveBeenCalled()
  })

  it('calcula el mismo filterHash sin importar el orden de las claves del filtro', async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    await createFeedSession(
      { scope: 'home', filter: { tag: 'branding', lang: 'es' } },
      createRow,
    )
    const firstHash = createRow.mock.calls[0][0].filterHash

    createRow.mockClear()
    await createFeedSession(
      { scope: 'home', filter: { lang: 'es', tag: 'branding' } },
      createRow,
    )
    const secondHash = createRow.mock.calls[0][0].filterHash

    expect(firstHash).toBe(secondHash)
    expect(firstHash).not.toBeNull()
  })

  it('sin filtro, filterHash es null (no una cadena vacía con hash)', async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    await createFeedSession({ scope: 'home' }, createRow)

    expect(createRow).toHaveBeenCalledWith({ scope: 'home', filterHash: null })
  })

  it('panel de recomendaciones (especificacion-final-formato-detalle.md §1, §6): pasa excludeContentId al repositorio', async () => {
    const createRow = vi.fn().mockResolvedValue(
      fakeRow({ excludeContentId: 'content-123' }),
    )

    await createFeedSession(
      { scope: 'home', excludeContentId: 'content-123' },
      createRow,
    )

    expect(createRow).toHaveBeenCalledWith({
      scope: 'home',
      filterHash: null,
      excludeContentId: 'content-123',
    })
  })

  it('sin excludeContentId, no se manda (sesión normal de home/subhome, sin exclusión)', async () => {
    const createRow = vi.fn().mockResolvedValue(fakeRow())

    await createFeedSession({ scope: 'home' }, createRow)

    expect(createRow).toHaveBeenCalledWith({
      scope: 'home',
      filterHash: null,
      excludeContentId: undefined,
    })
  })
})
