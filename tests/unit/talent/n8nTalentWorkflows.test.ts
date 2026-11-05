import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  N8N_TIMEOUT_MS,
  callWebhook,
  n8nTalentWorkflows,
} from '@/modules/talent/infrastructure/n8nTalentWorkflows'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(new Response('ok', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('webhooks de n8n', () => {
  it('"Enviar mail a candidato": POST con { access_token } al webhook configurado', async () => {
    await n8nTalentWorkflows.sendFormLink('tok-1')

    const [url, init] = fetchMock.mock.calls[0]

    expect(url).toBe('https://n8n.test.local/webhook/send-link')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ access_token: 'tok-1' })
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.cache).toBe('no-store')
  })

  it('"Guardar archivos": POST con { candidate_id }', async () => {
    await n8nTalentWorkflows.processCandidate('cand-1')

    const [url, init] = fetchMock.mock.calls[0]

    expect(url).toBe('https://n8n.test.local/webhook/process-files')
    expect(JSON.parse(init.body)).toEqual({ candidate_id: 'cand-1' })
  })

  it('"Procesar nuevo CV" va sin cuerpo (procesa todas las filas pending)', async () => {
    await callWebhook('https://n8n.test.local/webhook/process-cv', undefined)

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })

  it('"Procesar nuevo CV" desde el ABM: POST sin cuerpo al webhook configurado', async () => {
    await n8nTalentWorkflows.processPendingCvs()

    const [url, init] = fetchMock.mock.calls[0]

    expect(url).toBe('https://n8n.test.local/webhook/process-cv')
    expect(init.method).toBe('POST')
    expect(init.body).toBeUndefined()
  })

  it('sin la variable del webhook de CVs, un error propio y sin llamar a n8n', async () => {
    vi.resetModules()
    vi.stubEnv('TALENT_N8N_PROCESS_CV_WEBHOOK_URL', undefined)

    const { n8nTalentWorkflows: fresh } =
      await import('@/modules/talent/infrastructure/n8nTalentWorkflows')
    const { WebhookNotConfiguredError: FreshError } =
      await import('@/modules/talent/domain/talentErrors')

    await expect(fresh.processPendingCvs()).rejects.toBeInstanceOf(FreshError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lleva un tiempo máximo', async () => {
    await n8nTalentWorkflows.sendFormLink('t')

    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    expect(N8N_TIMEOUT_MS).toBeLessThanOrEqual(10_000)
  })

  it('sin autenticación configurada no manda ninguna cabecera extra', async () => {
    await n8nTalentWorkflows.sendFormLink('t')

    expect(Object.keys(fetchMock.mock.calls[0][1].headers)).toEqual([
      'Content-Type',
    ])
  })

  it('con la cabecera de autenticación (fase 4) la manda en cada llamada', async () => {
    vi.resetModules()
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_NAME', 'X-Greener-Key')
    vi.stubEnv('TALENT_N8N_WEBHOOK_AUTH_HEADER_VALUE', 'valor-secreto')

    const { n8nTalentWorkflows: fresh } =
      await import('@/modules/talent/infrastructure/n8nTalentWorkflows')
    await fresh.sendFormLink('t')

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      'X-Greener-Key': 'valor-secreto',
    })
  })

  it('un estado no 2xx es un error que no incluye la URL del webhook', async () => {
    fetchMock.mockResolvedValueOnce(new Response('x', { status: 500 }))

    const error = await n8nTalentWorkflows
      .sendFormLink('t')
      .catch((e: Error) => e)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('500')
    expect((error as Error).message).not.toContain('n8n.test.local')
  })

  it('un fallo de red o un tiempo agotado tampoco filtra la URL', async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(
        new Error('getaddrinfo ENOTFOUND n8n.test.local/webhook/send-link'),
        {
          name: 'TimeoutError',
        },
      ),
    )

    const error = await n8nTalentWorkflows
      .sendFormLink('t')
      .catch((e: Error) => e)

    expect((error as Error).message).not.toMatch(/n8n\.test\.local|webhook/)
  })
})
