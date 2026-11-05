import { beforeEach, describe, expect, it, vi } from 'vitest'

const CANDIDATE = '0b1f1a52-3b8e-4a0e-9c1d-5d4e6f7a8b9c'

const getAdminActor = vi.fn()
const recordAuditEvent = vi.fn()
const prepareStaffCvUpload = vi.fn()
const registerStaffCv = vi.fn()
const processPendingCvs = vi.fn()
const reprocessCandidate = vi.fn()
const deleteCandidate = vi.fn()
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`)
})
const resendFormLink = vi.fn()
const revalidatePath = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => redirect(url),
}))

vi.mock('@/lib/auth/adminSession', () => ({
  ADMIN_REQUIRED_MESSAGE: 'sesión caducada',
  getAdminActor: () => getAdminActor(),
}))

vi.mock('@/modules/audit/container', () => ({
  recordAuditEvent: (event: unknown) => recordAuditEvent(event),
}))

vi.mock('@/modules/talent/container', () => ({
  prepareStaffCvUpload: (...args: unknown[]) => prepareStaffCvUpload(...args),
  registerStaffCv: (...args: unknown[]) => registerStaffCv(...args),
  processPendingCvs: (...args: unknown[]) => processPendingCvs(...args),
  reprocessCandidate: (...args: unknown[]) => reprocessCandidate(...args),
  deleteCandidate: (...args: unknown[]) => deleteCandidate(...args),
  resendFormLink: (...args: unknown[]) => resendFormLink(...args),
}))

const actions = await import('@/app/admin/(panel)/talent/actions')

function form(entries: Record<string, string | File>) {
  const data = new FormData()

  for (const [key, value] of Object.entries(entries)) data.set(key, value)

  return data
}

const FILE = { name: 'cv.pdf', size: 5_000_000 }
const PATH = 'uploads/11111111-2222-4333-8444-555555555555.pdf'

beforeEach(() => {
  for (const mock of [
    getAdminActor,
    recordAuditEvent,
    prepareStaffCvUpload,
    registerStaffCv,
    processPendingCvs,
    reprocessCandidate,
    deleteCandidate,
    resendFormLink,
    revalidatePath,
  ]) {
    mock.mockReset()
  }

  redirect.mockClear()
  getAdminActor.mockResolvedValue({ email: 'ana@itsgreener.com' })
  recordAuditEvent.mockResolvedValue(true)
})

describe('sin sesión de admin, ninguna acción hace nada', () => {
  beforeEach(() => getAdminActor.mockResolvedValue(null))

  it('prepareStaffCvUploadAction', async () => {
    expect(await actions.prepareStaffCvUploadAction(FILE)).toEqual({
      ok: false,
      error: 'sesión caducada',
    })
    expect(prepareStaffCvUpload).not.toHaveBeenCalled()
  })

  it('registerStaffCvAction', async () => {
    expect(await actions.registerStaffCvAction(PATH)).toEqual({
      ok: false,
      error: 'sesión caducada',
    })
    expect(registerStaffCv).not.toHaveBeenCalled()
  })

  it('processPendingCvsAction', async () => {
    expect(await actions.processPendingCvsAction({}, form({}))).toEqual({
      error: 'sesión caducada',
    })
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('reprocessCandidateAction', async () => {
    expect(
      await actions.reprocessCandidateAction(
        {},
        form({ candidateId: CANDIDATE }),
      ),
    ).toEqual({ error: 'sesión caducada' })
    expect(reprocessCandidate).not.toHaveBeenCalled()
  })

  it('resendFormLinkAction', async () => {
    expect(
      await actions.resendFormLinkAction({}, form({ candidateId: CANDIDATE })),
    ).toEqual({ error: 'sesión caducada' })
    expect(resendFormLink).not.toHaveBeenCalled()
  })

  it('deleteCandidateAction', async () => {
    expect(
      await actions.deleteCandidateAction({}, form({ candidateId: CANDIDATE })),
    ).toEqual({ error: 'sesión caducada' })
    expect(deleteCandidate).not.toHaveBeenCalled()
  })
})

describe('deleteCandidateAction', () => {
  it('elimina, anota sin datos personales y vuelve al listado con el aviso', async () => {
    deleteCandidate.mockResolvedValue({
      ok: true,
      bucketFiles: 1,
      externalFiles: 1,
      newsletterAccepted: true,
    })

    await expect(
      actions.deleteCandidateAction({}, form({ candidateId: CANDIDATE })),
    ).rejects.toThrow(
      'NEXT_REDIRECT /admin/talent?deleted=1&drive=1&newsletter=1',
    )

    expect(deleteCandidate).toHaveBeenCalledWith(CANDIDATE)
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorEmail: 'ana@itsgreener.com',
      action: 'talent.candidate_delete',
      entity: 'talent_candidate',
      entityId: CANDIDATE,
      payload: { bucketFiles: 1, externalFiles: 1, newsletter: true },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/talent')
  })

  it('sin Drive ni newsletter el aviso no lleva avisos de pendientes', async () => {
    deleteCandidate.mockResolvedValue({
      ok: true,
      bucketFiles: 2,
      externalFiles: 0,
      newsletterAccepted: false,
    })

    await expect(
      actions.deleteCandidateAction({}, form({ candidateId: CANDIDATE })),
    ).rejects.toThrow('NEXT_REDIRECT /admin/talent?deleted=1')
  })

  it('un id que no es uuid no llega al caso de uso', async () => {
    const state = await actions.deleteCandidateAction(
      {},
      form({ candidateId: "x' or 1=1" }),
    )

    expect(state.error).toBeTruthy()
    expect(deleteCandidate).not.toHaveBeenCalled()
  })

  it.each([
    ['not_found', 'ya no existe'],
    ['unavailable', 'repetirlo es seguro'],
  ])('%s se explica y no deja rastro en Actividad', async (reason, text) => {
    deleteCandidate.mockResolvedValue({ ok: false, reason })

    const state = await actions.deleteCandidateAction(
      {},
      form({ candidateId: CANDIDATE }),
    )

    expect(state.error).toContain(text)
    expect(recordAuditEvent).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})

describe('prepareStaffCvUploadAction', () => {
  it('devuelve la URL firmada y NO crea nada ni anota nada todavía', async () => {
    prepareStaffCvUpload.mockResolvedValue({
      ok: true,
      path: PATH,
      signedUrl: 'https://signed.example/x',
      contentType: 'application/pdf',
    })

    expect(await actions.prepareStaffCvUploadAction(FILE)).toEqual({
      ok: true,
      path: PATH,
      signedUrl: 'https://signed.example/x',
      contentType: 'application/pdf',
    })
    expect(prepareStaffCvUpload).toHaveBeenCalledWith(FILE)
    expect(registerStaffCv).not.toHaveBeenCalled()
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('explica el rechazo de un fichero con una frase (10 MB, no 3,5)', async () => {
    prepareStaffCvUpload.mockResolvedValue({
      ok: false,
      reason: 'file_rejected',
      rejection: 'file_too_large',
    })

    expect(await actions.prepareStaffCvUploadAction(FILE)).toEqual({
      ok: false,
      error: 'supera los 10 MB.',
    })
  })

  it('si Storage falla, dice que se reintente', async () => {
    prepareStaffCvUpload.mockResolvedValue({
      ok: false,
      reason: 'unavailable',
    })

    const result = await actions.prepareStaffCvUploadAction(FILE)

    expect(result.ok).toBe(false)
  })

  it('un argumento que no es {name, size} no llega al caso de uso', async () => {
    expect(
      (await actions.prepareStaffCvUploadAction({ name: 3 } as never)).ok,
    ).toBe(false)
    expect((await actions.prepareStaffCvUploadAction(null as never)).ok).toBe(
      false,
    )
    expect(prepareStaffCvUpload).not.toHaveBeenCalled()
  })
})

describe('registerStaffCvAction', () => {
  it('registra con el email del admin y lo anota en la actividad', async () => {
    registerStaffCv.mockResolvedValue({
      ok: true,
      candidateId: CANDIDATE,
      bytes: 5,
    })

    expect(await actions.registerStaffCvAction(PATH)).toEqual({ ok: true })
    expect(registerStaffCv).toHaveBeenCalledWith(PATH, 'ana@itsgreener.com')
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorEmail: 'ana@itsgreener.com',
      action: 'talent.cv_upload',
      entity: 'talent_candidate',
      entityId: CANDIDATE,
      payload: { bytes: 5 },
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/talent')
  })

  it('no lanza el procesado: eso se hace una vez por lote', async () => {
    registerStaffCv.mockResolvedValue({
      ok: true,
      candidateId: CANDIDATE,
      bytes: 5,
    })

    await actions.registerStaffCvAction(PATH)

    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('explica el rechazo de un fichero con una frase', async () => {
    registerStaffCv.mockResolvedValue({
      ok: false,
      reason: 'file_rejected',
      rejection: 'file_type',
    })

    const result = await actions.registerStaffCvAction(PATH)

    expect(result.ok).toBe(false)
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('sin ruta no llama al caso de uso', async () => {
    expect((await actions.registerStaffCvAction('')).ok).toBe(false)
    expect((await actions.registerStaffCvAction(undefined as never)).ok).toBe(
      false,
    )
    expect(registerStaffCv).not.toHaveBeenCalled()
  })

  it('si falla la anotación, lo registrado no se da por perdido', async () => {
    registerStaffCv.mockResolvedValue({
      ok: true,
      candidateId: CANDIDATE,
      bytes: 5,
    })
    recordAuditEvent.mockResolvedValue(false)

    expect((await actions.registerStaffCvAction(PATH)).ok).toBe(true)
  })
})

describe('processPendingCvsAction', () => {
  it('lanzado: lo anota y no ofrece forzar', async () => {
    processPendingCvs.mockResolvedValue({ status: 'triggered', pending: 3 })

    const state = await actions.processPendingCvsAction({}, form({}))

    expect(processPendingCvs).toHaveBeenCalledWith({ force: false })
    expect(state.canForce).toBe(false)
    expect(state.message).toContain('3 CVs')
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'talent.process_launch',
        entityId: null,
        payload: { pending: 3, forced: false },
      }),
    )
    expect(revalidatePath).toHaveBeenCalledWith('/admin/talent')
  })

  it('con "force=true" lo pasa al caso de uso y lo anota como forzado', async () => {
    processPendingCvs.mockResolvedValue({ status: 'triggered', pending: 1 })

    await actions.processPendingCvsAction({}, form({ force: 'true' }))

    expect(processPendingCvs).toHaveBeenCalledWith({ force: true })
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { pending: 1, forced: true } }),
    )
  })

  it('"force" con otro valor no fuerza', async () => {
    processPendingCvs.mockResolvedValue({ status: 'nothing_pending' })

    await actions.processPendingCvsAction({}, form({ force: 'yes' }))

    expect(processPendingCvs).toHaveBeenCalledWith({ force: false })
  })

  it('ocupado por filas en started: ofrece "lanzar igualmente" y no anota', async () => {
    processPendingCvs.mockResolvedValue({
      status: 'busy',
      reason: 'in_progress',
      pending: 2,
    })

    const state = await actions.processPendingCvsAction({}, form({}))

    expect(state.canForce).toBe(true)
    expect(state.error).toBeUndefined()
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('ocupado por el tiempo mínimo: no ofrece forzar', async () => {
    processPendingCvs.mockResolvedValue({
      status: 'busy',
      reason: 'cooldown',
      pending: 2,
    })

    expect((await actions.processPendingCvsAction({}, form({}))).canForce).toBe(
      false,
    )
  })

  it.each(['not_configured', 'unavailable'])(
    '%s es un error',
    async (status) => {
      processPendingCvs.mockResolvedValue({ status })

      const state = await actions.processPendingCvsAction({}, form({}))

      expect(state.error).toBeTruthy()
      expect(state.message).toBeUndefined()
    },
  )
})

describe('reprocessCandidateAction', () => {
  it('reprocesa, lo anota y refresca la ficha', async () => {
    reprocessCandidate.mockResolvedValue({
      ok: true,
      processing: { status: 'triggered', pending: 1 },
    })

    const state = await actions.reprocessCandidateAction(
      {},
      form({ candidateId: CANDIDATE }),
    )

    expect(state.message).toContain('Procesado lanzado')
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorEmail: 'ana@itsgreener.com',
      action: 'talent.reprocess',
      entity: 'talent_candidate',
      entityId: CANDIDATE,
      payload: { launch: 'triggered' },
    })
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/talent/${CANDIDATE}`)
  })

  it('un id que no es uuid no llega al caso de uso', async () => {
    const state = await actions.reprocessCandidateAction(
      {},
      form({ candidateId: "x' or 1=1" }),
    )

    expect(state.error).toBeTruthy()
    expect(reprocessCandidate).not.toHaveBeenCalled()
  })

  it.each([
    ['not_found', 'ya no existe'],
    ['not_reprocessable', 'Solo se pueden reprocesar'],
    ['unavailable', 'No se ha podido'],
  ])('%s se explica', async (reason, text) => {
    reprocessCandidate.mockResolvedValue({ ok: false, reason })

    const state = await actions.reprocessCandidateAction(
      {},
      form({ candidateId: CANDIDATE }),
    )

    expect(state.error).toContain(text)
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })
})

describe('resendFormLinkAction', () => {
  it('reenvía y lo anota sin guardar el email en la actividad', async () => {
    resendFormLink.mockResolvedValue({ ok: true })

    const state = await actions.resendFormLinkAction(
      {},
      form({ candidateId: CANDIDATE }),
    )

    expect(state.message).toContain('Enlace enviado')
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorEmail: 'ana@itsgreener.com',
      action: 'talent.link_resend',
      entity: 'talent_candidate',
      entityId: CANDIDATE,
    })
  })

  it.each([
    ['not_found', 'ya no existe'],
    ['no_email', 'no tiene email'],
    ['in_process', 'procesando'],
    ['unavailable', 'No se ha podido'],
  ])('%s se explica', async (reason, text) => {
    resendFormLink.mockResolvedValue({ ok: false, reason })

    const state = await actions.resendFormLinkAction(
      {},
      form({ candidateId: CANDIDATE }),
    )

    expect(state.error).toContain(text)
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('un id que no es uuid no llega al caso de uso', async () => {
    expect(
      (await actions.resendFormLinkAction({}, form({ candidateId: 'nada' })))
        .error,
    ).toBeTruthy()
    expect(resendFormLink).not.toHaveBeenCalled()
  })
})
