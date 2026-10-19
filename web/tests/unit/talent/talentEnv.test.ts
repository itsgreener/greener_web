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

describe('getTalentMailchimpEnv', () => {
  it('exige el identificador de la audiencia de talent', async () => {
    vi.stubEnv('TALENT_MAILCHIMP_AUDIENCE_ID', '')
    const { getTalentMailchimpEnv, validateServerEnv } = await env()

    expect(() => getTalentMailchimpEnv()).toThrow(/talent/)
    expect(validateServerEnv()).toEqual(['Mailchimp (talent)'])
  })
})
