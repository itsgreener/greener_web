import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Cliente de Supabase encadenable mínimo para estos tests: cada método
 * de la cadena (.select/.eq/.gte/.insert) devuelve el mismo objeto, que
 * además es "thenable" — así `await client.from(...).select(...)...`
 * se resuelve con `result` sin necesitar un mock más elaborado.
 */
function createChainableClient(result: {
  count?: number | null
  error: unknown
}) {
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    insert: vi.fn(() => Promise.resolve({ error: result.error })),
    then: (resolve: (value: unknown) => void) => resolve(result),
  }
  return { from: vi.fn(() => chain), chain }
}

vi.mock('@/lib/supabase/serviceClient', () => ({
  createServiceClient: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('isRateLimited', () => {
  it('por debajo del límite (RATE_LIMIT_MAX_SUBMISSIONS), no está limitado', async () => {
    const { isRateLimited, RATE_LIMIT_MAX_SUBMISSIONS } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      count: RATE_LIMIT_MAX_SUBMISSIONS - 1,
      error: null,
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect(await isRateLimited('hash-1')).toBe(false)
  })

  it('al llegar al límite, sí está limitado', async () => {
    const { isRateLimited, RATE_LIMIT_MAX_SUBMISSIONS } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      count: RATE_LIMIT_MAX_SUBMISSIONS,
      error: null,
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect(await isRateLimited('hash-1')).toBe(true)
  })

  it('si Supabase falla al comprobar el límite, falla cerrado (fail closed) — se trata como limitado', async () => {
    const { isRateLimited } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      count: null,
      error: new Error('fallo de red'),
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect(await isRateLimited('hash-1')).toBe(true)
  })
})

describe('logContactSubmission', () => {
  it('inserta el registro con ip_hash, status y error', async () => {
    const { logContactSubmission } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from, chain } = createChainableClient({ error: null })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    await logContactSubmission('hash-1', 'sent')

    expect(from).toHaveBeenCalledWith('contact_submission')
    expect(chain.insert).toHaveBeenCalledWith({
      ip_hash: 'hash-1',
      status: 'sent',
      error: null,
    })
  })

  it('si falla el insert, no lanza — el registro es "mínimo" (§14.1), no crítico', async () => {
    const { logContactSubmission } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      error: new Error('fallo de red'),
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    await expect(
      logContactSubmission('hash-1', 'failed', 'algo'),
    ).resolves.toBeUndefined()
  })
})
