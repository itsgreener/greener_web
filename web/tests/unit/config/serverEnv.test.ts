import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Fase 2 (A11): las variables de cada integración se validan por ámbito y
 * de forma perezosa. Antes un único esquema exigía SMTP, Mailchimp y
 * Cloudmersive para servir cualquier página.
 */

const MAILCHIMP_VARS = [
  'MAILCHIMP_API_KEY',
  'MAILCHIMP_AUDIENCE_ID',
  'MAILCHIMP_SERVER_PREFIX',
] as const

beforeEach(() => {
  vi.resetModules()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('env.ts (ámbito base)', () => {
  it('se importa sin ninguna variable de integración (el proxy no depende de ellas)', async () => {
    for (const name of [
      ...MAILCHIMP_VARS,
      'CONTACT_SMTP_HOST',
      'CLOUDMERSIVE_API_KEY',
      'CLOUDINARY_API_SECRET',
    ]) {
      vi.stubEnv(name, '')
      delete process.env[name]
    }

    const { env } = await import('@/lib/env')

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy()
    expect('MAILCHIMP_API_KEY' in env).toBe(false)
  })
})

describe('getters por ámbito', () => {
  it('Mailchimp inválido falla solo en Mailchimp', async () => {
    vi.stubEnv('MAILCHIMP_SERVER_PREFIX', 'europa')

    const env = await import('@/lib/serverEnv')

    expect(() => env.getMailchimpEnv()).toThrow(/Mailchimp/)
    expect(env.getCloudinaryEnv().CLOUDINARY_API_KEY).toBeTruthy()
    expect(env.getContactEnv().CONTACT_SMTP_PORT).toBe(587)
  })

  it('cada ámbito se valida una sola vez', async () => {
    const env = await import('@/lib/serverEnv')

    const first = env.getCloudinaryEnv()
    vi.stubEnv('CLOUDINARY_API_KEY', 'cambiada-despues')

    expect(env.getCloudinaryEnv()).toBe(first)
  })

  it('el error nombra las variables que fallan', async () => {
    vi.stubEnv('CLOUDMERSIVE_API_KEY', '')

    const { getCloudmersiveEnv } = await import('@/lib/serverEnv')

    expect(() => getCloudmersiveEnv()).toThrow(/Cloudmersive/)
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Cloudmersive'),
      expect.objectContaining({ CLOUDMERSIVE_API_KEY: expect.any(Array) }),
    )
  })
})

describe('CONTACT_IP_HASH_SALT', () => {
  it('en desarrollo y tests tiene un valor por defecto', async () => {
    vi.stubEnv('CONTACT_IP_HASH_SALT', '')
    delete process.env.CONTACT_IP_HASH_SALT

    const { getIpHashEnv, DEV_IP_HASH_SALT } = await import('@/lib/serverEnv')

    expect(getIpHashEnv().CONTACT_IP_HASH_SALT).toBe(DEV_IP_HASH_SALT)
  })

  it('en producción es obligatoria', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CONTACT_IP_HASH_SALT', '')
    delete process.env.CONTACT_IP_HASH_SALT

    const { getIpHashEnv } = await import('@/lib/serverEnv')

    expect(() => getIpHashEnv()).toThrow(/hash de IP/)
  })

  it.each([
    ['la de desarrollo', 'greener-dev-salt'],
    ['la del ejemplo', 'fija-una-sal-propia-para-produccion'],
    ['una demasiado corta', 'corta'],
  ])('en producción no admite %s', async (_name, value) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CONTACT_IP_HASH_SALT', value)

    const { getIpHashEnv } = await import('@/lib/serverEnv')

    expect(() => getIpHashEnv()).toThrow()
  })

  it('en producción admite una sal propia', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CONTACT_IP_HASH_SALT', 'q7Vn2xLp9sTe4KdW8mRz3JcY')

    const { getIpHashEnv } = await import('@/lib/serverEnv')

    expect(getIpHashEnv().CONTACT_IP_HASH_SALT).toBe('q7Vn2xLp9sTe4KdW8mRz3JcY')
  })
})

describe('APP_SIGNING_SECRET (SEC-ADM-D1)', () => {
  it('en desarrollo y tests es opcional', async () => {
    vi.stubEnv('APP_SIGNING_SECRET', '')

    const { getSigningEnv } = await import('@/lib/serverEnv')

    expect(getSigningEnv().APP_SIGNING_SECRET).toBeUndefined()
  })

  it.each([
    ['ausente', ''],
    ['demasiado corta', 'corta'],
  ])('en producción no admite una clave %s', async (_name, value) => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_SIGNING_SECRET', value)

    const { getSigningEnv } = await import('@/lib/serverEnv')

    expect(() => getSigningEnv()).toThrow(/firma de tokens/)
  })

  it('en producción admite una clave de 32 o más caracteres', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_SIGNING_SECRET', 'x'.repeat(40))

    const { getSigningEnv } = await import('@/lib/serverEnv')

    expect(getSigningEnv().APP_SIGNING_SECRET).toBe('x'.repeat(40))
  })

  it('el arranque la cuenta entre los ámbitos inválidos si falta en producción', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('APP_SIGNING_SECRET', '')

    const { validateServerEnv } = await import('@/lib/serverEnv')

    expect(validateServerEnv()).toContain('firma de tokens')
  })
})

describe('validateServerEnv (arranque)', () => {
  it('con todo bien devuelve una lista vacía', async () => {
    const { validateServerEnv } = await import('@/lib/serverEnv')

    expect(validateServerEnv()).toEqual([])
  })

  it('devuelve los ámbitos inválidos sin lanzar', async () => {
    vi.stubEnv('MAILCHIMP_SERVER_PREFIX', 'europa')
    vi.stubEnv('CONTACT_SMTP_HOST', '')

    const { validateServerEnv } = await import('@/lib/serverEnv')

    expect(validateServerEnv()).toEqual(['contacto', 'Mailchimp'])
  })
})

describe('almacén compartido de límites (opcional)', () => {
  function clearStore() {
    for (const name of [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'KV_REST_API_URL',
      'KV_REST_API_TOKEN',
      'UPSTASH_KV_REST_API_URL',
      'UPSTASH_KV_REST_API_TOKEN',
      'UPSTASH_KV_REST_API_READ_ONLY_TOKEN',
    ]) {
      vi.stubEnv(name, '')
    }
  }

  it('sin variables es válido y no está configurado', async () => {
    clearStore()
    const env = await import('@/lib/serverEnv')

    expect(env.getRateLimitStoreEnv()).toEqual({
      url: undefined,
      token: undefined,
    })
    expect(env.isRateLimitStoreConfigured()).toBe(false)
    expect(env.validateServerEnv()).not.toContain('límites de uso compartidos')
  })

  it('acepta los nombres de Upstash y los de la integración de Vercel', async () => {
    clearStore()
    vi.stubEnv('KV_REST_API_URL', 'https://eu.upstash.io')
    vi.stubEnv('KV_REST_API_TOKEN', 'token')
    const env = await import('@/lib/serverEnv')

    expect(env.getRateLimitStoreEnv()).toEqual({
      url: 'https://eu.upstash.io',
      token: 'token',
    })
    expect(env.isRateLimitStoreConfigured()).toBe(true)
  })

  it('acepta los nombres con prefijo UPSTASH_KV_ que pone la integración de Vercel y no usa el token de solo lectura', async () => {
    clearStore()
    vi.stubEnv('UPSTASH_KV_REST_API_URL', 'https://eu.upstash.io')
    vi.stubEnv('UPSTASH_KV_REST_API_TOKEN', 'token-escritura')
    vi.stubEnv('UPSTASH_KV_REST_API_READ_ONLY_TOKEN', 'token-lectura')
    const env = await import('@/lib/serverEnv')

    expect(env.getRateLimitStoreEnv()).toEqual({
      url: 'https://eu.upstash.io',
      token: 'token-escritura',
    })
  })

  it('una URL sin token (o al revés) es inválida y se avisa en el arranque', async () => {
    clearStore()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://eu.upstash.io')
    const env = await import('@/lib/serverEnv')

    expect(env.isRateLimitStoreConfigured()).toBe(false)
    expect(env.validateServerEnv()).toContain('límites de uso compartidos')
  })

  it('la URL tiene que ser https (el token viaja en la cabecera)', async () => {
    clearStore()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'http://eu.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    const env = await import('@/lib/serverEnv')

    expect(() => env.getRateLimitStoreEnv()).toThrow(/límites de uso/)
  })
})
