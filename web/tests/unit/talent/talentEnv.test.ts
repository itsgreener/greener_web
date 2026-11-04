import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

async function env() {
  return import('@/lib/serverEnv')
}

describe('getTalentEnv', () => {
  it('valida las variables de talent', async () => {
    const { getTalentEnv } = await env()

    expect(getTalentEnv()).toMatchObject({
      TALENT_SUPABASE_URL: 'https://talent-test.supabase.co',
      TALENT_N8N_SEND_LINK_WEBHOOK_URL:
        'https://n8n.test.local/webhook/send-link',
    })
  })

  it.each([
    'eyJhbGciOiJIUzI1NiJ9.heredada.service_role',
    'sb_publishable_xxxxxxxxxxxxxxxx',
    '',
  ])('rechaza una clave que no es secreta nueva (%j)', async (key) => {
    vi.stubEnv('TALENT_SUPABASE_SECRET_KEY', key)
    const { getTalentEnv } = await env()

    expect(() => getTalentEnv()).toThrow(/Talent/)
  })

  it.each([
    'TALENT_SUPABASE_URL',
    'TALENT_N8N_SEND_LINK_WEBHOOK_URL',
    'TALENT_N8N_PROCESS_FILES_WEBHOOK_URL',
  ])('exige %s', async (name) => {
    vi.stubEnv(name, '')
    const { getTalentEnv } = await env()

    expect(() => getTalentEnv()).toThrow(/Talent/)
  })

  it('el webhook de "Procesar nuevo CV" es opcional hasta la fase 3', async () => {
    vi.stubEnv('TALENT_N8N_PROCESS_CV_WEBHOOK_URL', '')
    delete process.env.TALENT_N8N_PROCESS_CV_WEBHOOK_URL
    const { getTalentEnv } = await env()

    expect(getTalentEnv().TALENT_N8N_PROCESS_CV_WEBHOOK_URL).toBeUndefined()
  })

  it('la cabecera de autenticación va en pareja', async () => {
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', 'X-Key')
    delete process.env.TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE
    const { getTalentEnv } = await env()

    expect(() => getTalentEnv()).toThrow(/Talent/)
  })

  it('un fallo de talent no tumba el resto de ámbitos', async () => {
    vi.stubEnv('TALENT_SUPABASE_SECRET_KEY', 'mala')
    const serverEnv = await env()

    expect(serverEnv.validateServerEnv()).toEqual(['Talent'])
    expect(serverEnv.getMailchimpEnv().MAILCHIMP_API_KEY).toBeTruthy()
  })
})

describe('getTalentPurgeEnv', () => {
  const LONG = 'purga-secreta-de-prueba-con-32-caracteres!'

  it('es opcional: sin el secreto no falla y la ruta queda cerrada', async () => {
    delete process.env.TALENT_PURGE_SECRET
    const { getTalentPurgeEnv } = await env()

    expect(getTalentPurgeEnv().TALENT_PURGE_SECRET).toBeUndefined()
  })

  it('trata el valor vacío como ausente', async () => {
    vi.stubEnv('TALENT_PURGE_SECRET', '')
    const { getTalentPurgeEnv } = await env()

    expect(getTalentPurgeEnv().TALENT_PURGE_SECRET).toBeUndefined()
  })

  it('acepta 32 caracteres y rechaza 31', async () => {
    vi.stubEnv('TALENT_PURGE_SECRET', LONG.slice(0, 32))
    const { getTalentPurgeEnv } = await env()
    expect(getTalentPurgeEnv().TALENT_PURGE_SECRET).toHaveLength(32)

    vi.resetModules()
    vi.stubEnv('TALENT_PURGE_SECRET', LONG.slice(0, 31))
    const again = await env()
    expect(() => again.getTalentPurgeEnv()).toThrow(/purga/)
  })

  it('un secreto demasiado corto no tumba el resto de talent', async () => {
    vi.stubEnv('TALENT_PURGE_SECRET', 'corto')
    const serverEnv = await env()

    expect(serverEnv.validateServerEnv()).toEqual(['Talent (purga)'])
    expect(serverEnv.getTalentEnv().TALENT_SUPABASE_URL).toBeTruthy()
  })
})

describe('getTalentLegacyEnv', () => {
  const ORIGINS = 'TALENT_LEGACY_ALLOWED_ORIGINS'
  const EMAILS = 'TALENT_LEGACY_STAFF_EMAILS'

  it('es opcional: sin ninguna de las dos la ruta queda cerrada', async () => {
    delete process.env[ORIGINS]
    delete process.env[EMAILS]
    const { getTalentLegacyEnv, validateServerEnv } = await env()

    expect(getTalentLegacyEnv()).toEqual({
      allowedOrigins: [],
      staffEmails: [],
    })
    expect(validateServerEnv()).toEqual([])
  })

  it('trata los valores vacíos como ausentes', async () => {
    vi.stubEnv(ORIGINS, '')
    vi.stubEnv(EMAILS, '  ')
    const { getTalentLegacyEnv } = await env()

    expect(getTalentLegacyEnv().allowedOrigins).toEqual([])
    expect(getTalentLegacyEnv().staffEmails).toEqual([])
  })

  it('lee listas separadas por comas, con espacios y correos en minúsculas', async () => {
    vi.stubEnv(ORIGINS, 'https://talent.itsgreener.com, http://localhost:5173')
    vi.stubEnv(EMAILS, 'Ana@ItsGreener.com ,luis@itsgreener.com,')
    const { getTalentLegacyEnv } = await env()

    expect(getTalentLegacyEnv()).toEqual({
      allowedOrigins: [
        'https://talent.itsgreener.com',
        'http://localhost:5173',
      ],
      staffEmails: ['ana@itsgreener.com', 'luis@itsgreener.com'],
    })
  })

  it.each([
    'https://talent.itsgreener.com/',
    'https://talent.itsgreener.com/private',
    'http://talent.itsgreener.com',
    'talent.itsgreener.com',
  ])('rechaza el origen %s', async (origin) => {
    vi.stubEnv(ORIGINS, origin)
    vi.stubEnv(EMAILS, 'ana@itsgreener.com')
    const { getTalentLegacyEnv } = await env()

    expect(() => getTalentLegacyEnv()).toThrow(/web antigua/)
  })

  it('rechaza un correo mal escrito', async () => {
    vi.stubEnv(ORIGINS, 'https://talent.itsgreener.com')
    vi.stubEnv(EMAILS, 'ana@')
    const { getTalentLegacyEnv } = await env()

    expect(() => getTalentLegacyEnv()).toThrow(/web antigua/)
  })

  it('los orígenes y los correos van juntos', async () => {
    vi.stubEnv(ORIGINS, 'https://talent.itsgreener.com')
    delete process.env[EMAILS]
    const { getTalentLegacyEnv } = await env()

    expect(() => getTalentLegacyEnv()).toThrow(/web antigua/)
  })

  it('un fallo aquí no tumba el resto de talent', async () => {
    vi.stubEnv(ORIGINS, 'mal')
    vi.stubEnv(EMAILS, 'ana@itsgreener.com')
    const serverEnv = await env()

    expect(serverEnv.validateServerEnv()).toEqual(['Talent (web antigua)'])
    expect(serverEnv.getTalentEnv().TALENT_SUPABASE_URL).toBeTruthy()
  })
})

describe('getTalentMailchimpEnv', () => {
  it('exige el identificador de la audiencia de talent', async () => {
    vi.stubEnv('TALENT_MAILCHIMP_AUDIENCE_ID', '')
    const { getTalentMailchimpEnv, validateServerEnv } = await env()

    expect(() => getTalentMailchimpEnv()).toThrow(/talent/)
    expect(validateServerEnv()).toEqual(['Mailchimp (talent)'])
  })
})
