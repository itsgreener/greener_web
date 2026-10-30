import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * RES-D1: el arranque de producción avisa si los webhooks de n8n de talent no
 * llevan cabecera de autenticación (solo los protege su URL).
 */

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('NEXT_RUNTIME', 'nodejs')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function authWarnings(warn: ReturnType<typeof vi.spyOn>) {
  return warn.mock.calls.filter((call: unknown[]) =>
    String(call[0]).includes('TALENT_N8N_WEBHOOK_AUTH_HEADER'),
  )
}

describe('isTalentWebhookAuthMissing', () => {
  it('sin cabecera de autenticación es verdadero', async () => {
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', undefined)
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE', undefined)
    const env = await import('@/lib/serverEnv')

    expect(env.isTalentWebhookAuthMissing()).toBe(true)
  })

  it('con nombre y valor es falso', async () => {
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', 'X-Greener-Key')
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE', 'un-valor-largo')
    const env = await import('@/lib/serverEnv')

    expect(env.isTalentWebhookAuthMissing()).toBe(false)
  })

  it('con talent sin configurar es falso (ya lo cuenta validateServerEnv)', async () => {
    vi.stubEnv('TALENT_SUPABASE_URL', '')
    const env = await import('@/lib/serverEnv')

    expect(env.isTalentWebhookAuthMissing()).toBe(false)
  })
})

describe('aviso del arranque', () => {
  it('en producción y sin cabecera, avisa una vez', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', undefined)
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE', undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await (await import('@/instrumentation')).register()

    expect(authWarnings(warn)).toHaveLength(1)
  })

  it('en producción y con cabecera, no avisa', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', 'X-Greener-Key')
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE', 'un-valor-largo')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await (await import('@/instrumentation')).register()

    expect(authWarnings(warn)).toHaveLength(0)
  })

  it('fuera de producción no avisa', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', undefined)
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE', undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await (await import('@/instrumentation')).register()

    expect(authWarnings(warn)).toHaveLength(0)
  })
})
