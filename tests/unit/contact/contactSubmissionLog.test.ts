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

describe('checkRateLimit', () => {
  it('por debajo del límite (RATE_LIMIT_MAX_SUBMISSIONS), permite el envío', async () => {
    const { checkRateLimit, RATE_LIMIT_MAX_SUBMISSIONS } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      count: RATE_LIMIT_MAX_SUBMISSIONS - 1,
      error: null,
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect(await checkRateLimit('hash-1')).toBe('allowed')
  })

  it('al llegar al límite, está limitado', async () => {
    const { checkRateLimit, RATE_LIMIT_MAX_SUBMISSIONS } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      count: RATE_LIMIT_MAX_SUBMISSIONS,
      error: null,
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect(await checkRateLimit('hash-1')).toBe('limited')
  })

  it('si Supabase falla al comprobar el límite, devuelve «unavailable» (el formulario no envía) y lo deja en el log', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { checkRateLimit } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    const { from } = createChainableClient({
      count: null,
      error: new Error('fallo de red'),
    })
    vi.mocked(createServiceClient).mockReturnValue({ from } as never)

    expect(await checkRateLimit('hash-1')).toBe('unavailable')
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('si ni siquiera se puede crear el cliente (falta configuración), tampoco lanza: «unavailable»', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { checkRateLimit } =
      await import('@/modules/contact/infrastructure/contactSubmissionLog')
    const { createServiceClient } = await import('@/lib/supabase/serviceClient')

    vi.mocked(createServiceClient).mockImplementation(() => {
      throw new Error('falta SUPABASE_SECRET_KEY')
    })

    await expect(checkRateLimit('hash-1')).resolves.toBe('unavailable')
    consoleError.mockRestore()
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
