import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeLaunchLegacyProcessing } from '@/modules/talent/application/launchLegacyProcessing'

const verify = vi.fn()
const processPendingCvs = vi.fn()
const recordAudit = vi.fn()
const byIp = { check: vi.fn() }
const byStaff = { check: vi.fn() }

const launch = makeLaunchLegacyProcessing({
  verifier: { verify },
  allowedEmails: () => ['ana@itsgreener.com', 'luis@itsgreener.com'],
  processPendingCvs,
  limiters: { byIp, byStaff },
  recordAudit,
})

const input = { accessToken: 'jwt', ipKey: 'ip-hash' }

beforeEach(() => {
  vi.clearAllMocks()
  byIp.check.mockResolvedValue(true)
  byStaff.check.mockResolvedValue(true)
  verify.mockResolvedValue({ email: 'ana@itsgreener.com' })
  processPendingCvs.mockResolvedValue({ status: 'triggered', pending: 3 })
  recordAudit.mockResolvedValue(true)
})

describe('launchLegacyProcessing', () => {
  it('lanza el procesado y deja constancia con el correo de quien subió', async () => {
    expect(await launch(input)).toEqual({ status: 'triggered', pending: 3 })

    expect(verify).toHaveBeenCalledWith('jwt')
    expect(processPendingCvs).toHaveBeenCalledOnce()
    expect(recordAudit).toHaveBeenCalledWith({
      actorEmail: 'ana@itsgreener.com',
      pending: 3,
    })
  })

  it('compara el correo sin distinguir mayúsculas', async () => {
    verify.mockResolvedValue({ email: 'Ana@ItsGreener.com' })

    expect((await launch(input)).status).toBe('triggered')
    expect(byStaff.check).toHaveBeenCalledWith('ana@itsgreener.com')
  })

  it('el tope por IP va antes de preguntar a Supabase', async () => {
    byIp.check.mockResolvedValue(false)

    expect(await launch(input)).toEqual({ status: 'rate_limited' })
    expect(byIp.check).toHaveBeenCalledWith('ip-hash')
    expect(verify).not.toHaveBeenCalled()
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('un token que no es válido no llega a n8n', async () => {
    verify.mockResolvedValue(null)

    expect(await launch(input)).toEqual({ status: 'unauthorized' })
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('una sesión válida de un correo que no está en la lista no llega a n8n', async () => {
    verify.mockResolvedValue({ email: 'otra@gmail.com' })

    expect(await launch(input)).toEqual({ status: 'forbidden' })
    expect(byStaff.check).not.toHaveBeenCalled()
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('el tope por persona frena antes de lanzar', async () => {
    byStaff.check.mockResolvedValue(false)

    expect(await launch(input)).toEqual({ status: 'rate_limited' })
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it.each([
    [{ status: 'nothing_pending' }],
    [{ status: 'busy', reason: 'in_progress', pending: 2 }],
    [{ status: 'busy', reason: 'cooldown', pending: 2 }],
    [{ status: 'not_configured' }],
    [{ status: 'unavailable' }],
  ])('devuelve %j sin anotarlo en Actividad', async (result) => {
    processPendingCvs.mockResolvedValue(result)

    expect(await launch(input)).toEqual(result)
    expect(recordAudit).not.toHaveBeenCalled()
  })

  it('no fuerza nunca el lanzamiento', async () => {
    await launch(input)

    expect(processPendingCvs).toHaveBeenCalledWith()
  })
})
