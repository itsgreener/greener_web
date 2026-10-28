import { describe, expect, it, vi } from 'vitest'

import { makeProcessPendingCvs } from '@/modules/talent/application/processPendingCvs'
import { makeReprocessCandidate } from '@/modules/talent/application/reprocessCandidate'
import { makeResendFormLink } from '@/modules/talent/application/resendFormLink'
import { makeResolveCvLink } from '@/modules/talent/application/resolveCvLink'
import { makeUploadStaffCv } from '@/modules/talent/application/uploadStaffCv'
import {
  FileScanRejectedError,
  WebhookNotConfiguredError,
} from '@/modules/talent/domain/talentErrors'
import {
  CANDIDATE_ID,
  FILE_BYTES,
  fakeAdminRepository,
  fakeScanner,
  fakeStorage,
  fakeWorkflows,
} from '@tests/helpers/talentFakes'

const FILE_ID = '5a1c7d3e-9f4b-4c2a-8e6d-1b3f5a7c9e0d'
const UUID = '11111111-2222-4333-8444-555555555555'

function silence() {
  return vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('resolveCvLink', () => {
  function setup(path: string | null, fileId: string | null = null) {
    const { admin } = fakeAdminRepository({
      paths: { [fileId ? `${CANDIDATE_ID}:${fileId}` : CANDIDATE_ID]: path },
    })
    const { storage, createSignedUrl } = fakeStorage()

    return {
      createSignedUrl,
      resolve: () =>
        makeResolveCvLink({ admin, storage })({
          candidateId: CANDIDATE_ID,
          fileId,
        }),
    }
  }

  it('un CV del bucket se firma por 60 segundos', async () => {
    const { resolve, createSignedUrl } = setup('uploads/abc.pdf')

    expect(await resolve()).toEqual({
      ok: true,
      kind: 'bucket',
      url: 'https://signed.example/uploads/abc.pdf?expires=60',
    })
    expect(createSignedUrl).toHaveBeenCalledWith('uploads/abc.pdf', 60)
  })

  it('un CV de Drive se devuelve tal cual, sin firmar', async () => {
    const link = 'https://drive.google.com/file/d/abc/view'
    const { resolve, createSignedUrl } = setup(link)

    expect(await resolve()).toEqual({ ok: true, kind: 'drive', url: link })
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('también resuelve un fichero suelto (files)', async () => {
    const { resolve } = setup('https://drive.google.com/file/d/f/view', FILE_ID)

    expect(await resolve()).toMatchObject({ ok: true, kind: 'drive' })
  })

  it('sin ruta o con algo que no es un enlace no hay nada que abrir', async () => {
    expect(await setup(null).resolve()).toEqual({
      ok: false,
      reason: 'not_found',
    })
    expect(await setup('texto sin enlace').resolve()).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('una ruta con escape de directorio no se firma', async () => {
    const { resolve, createSignedUrl } = setup('uploads/../otra/cosa.pdf')

    expect((await resolve()).ok).toBe(false)
    expect(createSignedUrl).not.toHaveBeenCalled()
  })

  it('si falla la base o la firma, "unavailable" y el error va al log', async () => {
    const log = silence()
    const { admin, failOn } = fakeAdminRepository({
      paths: { [CANDIDATE_ID]: 'uploads/abc.pdf' },
    })
    const { storage } = fakeStorage()

    failOn.add('findStoredPath')

    expect(
      await makeResolveCvLink({ admin, storage })({
        candidateId: CANDIDATE_ID,
        fileId: null,
      }),
    ).toEqual({ ok: false, reason: 'unavailable' })
    expect(log).toHaveBeenCalled()
  })
})

describe('uploadStaffCv', () => {
  function setup() {
    const repo = fakeAdminRepository()
    const { storage, upload, remove } = fakeStorage()
    const { scanner, scan } = fakeScanner()
    const uploadStaffCv = makeUploadStaffCv({
      admin: repo.admin,
      storage,
      scanner,
      newId: () => UUID,
    })

    return { ...repo, upload, remove, scan, uploadStaffCv }
  }

  it('guarda uploads/<uuid>.<ext> y crea una fila pending con quien la sube', async () => {
    const { uploadStaffCv, upload, scan, staffRows } = setup()

    const result = await uploadStaffCv(
      { name: 'Mi CV (final).PDF', bytes: FILE_BYTES.pdf },
      'ana@itsgreener.com',
    )

    expect(result.ok).toBe(true)
    expect(scan).toHaveBeenCalledOnce()
    expect(upload).toHaveBeenCalledWith(
      `uploads/${UUID}.pdf`,
      FILE_BYTES.pdf,
      'application/pdf',
    )
    expect(staffRows).toEqual([
      {
        status: 'pending',
        file_path: `uploads/${UUID}.pdf`,
        uploaded_by: 'ana@itsgreener.com',
      },
    ])
  })

  it('el nombre del fichero no llega al bucket ni a la base', async () => {
    const { uploadStaffCv, upload, staffRows } = setup()

    await uploadStaffCv(
      { name: 'Ñandú ../ con espacios.pdf', bytes: FILE_BYTES.pdf },
      'ana@itsgreener.com',
    )

    expect(upload.mock.calls[0][0]).toBe(`uploads/${UUID}.pdf`)
    expect(JSON.stringify(staffRows)).not.toContain('Ñandú')
  })

  it.each([
    ['vacío', new Uint8Array(), 'cv.pdf', 'file_empty'],
    ['más de 10 MB', new Uint8Array(10_000_001), 'cv.pdf', 'file_too_large'],
    ['extensión no admitida', FILE_BYTES.pdf, 'cv.exe', 'file_type'],
    [
      'contenido que no es lo que dice la extensión',
      FILE_BYTES.text,
      'cv.pdf',
      'file_type',
    ],
    ['un pdf con extensión png', FILE_BYTES.pdf, 'cv.png', 'file_type'],
  ])(
    'rechaza un fichero %s antes de tocar nada',
    async (_name, bytes, name, rejection) => {
      const { uploadStaffCv, upload, scan, calls } = setup()

      expect(
        await uploadStaffCv({ name, bytes }, 'ana@itsgreener.com'),
      ).toEqual({
        ok: false,
        reason: 'file_rejected',
        rejection,
      })
      expect(scan).not.toHaveBeenCalled()
      expect(upload).not.toHaveBeenCalled()
      expect(calls).toEqual([])
    },
  )

  it('si el antivirus no lo da por limpio, no se sube ni se crea la fila', async () => {
    const { uploadStaffCv, upload, scan, calls } = setup()

    scan.mockRejectedValueOnce(new FileScanRejectedError())

    expect(
      await uploadStaffCv(
        { name: 'cv.pdf', bytes: FILE_BYTES.pdf },
        'ana@itsgreener.com',
      ),
    ).toEqual({ ok: false, reason: 'file_rejected', rejection: 'file_scan' })
    expect(upload).not.toHaveBeenCalled()
    expect(calls).toEqual([])
  })

  it('si falla la fila, borra el objeto del bucket (no deja CVs huérfanos)', async () => {
    const log = silence()
    const { uploadStaffCv, remove, failOn } = setup()

    failOn.add('insertStaffCandidate')

    expect(
      await uploadStaffCv(
        { name: 'cv.pdf', bytes: FILE_BYTES.pdf },
        'ana@itsgreener.com',
      ),
    ).toEqual({ ok: false, reason: 'unavailable' })
    expect(remove).toHaveBeenCalledWith(`uploads/${UUID}.pdf`)
    expect(log).toHaveBeenCalled()
  })
})

describe('processPendingCvs', () => {
  function setup(counts: Record<string, number>, start = 1_000_000) {
    const { admin } = fakeAdminRepository({ counts })
    const { workflows, processPendingCvs } = fakeWorkflows()
    let clock = start

    return {
      processPendingCvs,
      advance: (ms: number) => {
        clock += ms
      },
      run: makeProcessPendingCvs({
        admin,
        workflows,
        now: () => clock,
        cooldownMs: 120_000,
      }),
    }
  }

  it('sin pendientes no llama a n8n', async () => {
    const { run, processPendingCvs } = setup({ pending: 0, started: 0 })

    expect(await run()).toEqual({ status: 'nothing_pending' })
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('con pendientes lo lanza UNA vez', async () => {
    const { run, processPendingCvs } = setup({ pending: 3 })

    expect(await run()).toEqual({ status: 'triggered', pending: 3 })
    expect(processPendingCvs).toHaveBeenCalledOnce()
  })

  it('no lo lanza si hay filas en started (n8n está trabajando)', async () => {
    const { run, processPendingCvs } = setup({ pending: 2, started: 1 })

    expect(await run()).toEqual({
      status: 'busy',
      reason: 'in_progress',
      pending: 2,
    })
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('"force" se salta el control de started (filas atascadas)', async () => {
    const { run, processPendingCvs } = setup({ pending: 2, started: 23 })

    expect(await run({ force: true })).toEqual({
      status: 'triggered',
      pending: 2,
    })
    expect(processPendingCvs).toHaveBeenCalledOnce()
  })

  it('una segunda llamada seguida no repite el lanzamiento, ni con force', async () => {
    const { run, processPendingCvs, advance } = setup({ pending: 2 })

    await run()
    advance(30_000)

    expect(await run()).toMatchObject({ status: 'busy', reason: 'cooldown' })
    expect(await run({ force: true })).toMatchObject({
      status: 'busy',
      reason: 'cooldown',
    })
    expect(processPendingCvs).toHaveBeenCalledOnce()
  })

  it('pasado el tiempo mínimo se puede volver a lanzar', async () => {
    const { run, processPendingCvs, advance } = setup({ pending: 2 })

    await run()
    advance(120_001)
    await run()

    expect(processPendingCvs).toHaveBeenCalledTimes(2)
  })

  it('dos llamadas simultáneas solo lanzan una vez', async () => {
    const { run, processPendingCvs } = setup({ pending: 2 })

    const results = await Promise.all([run(), run()])

    expect(
      results.filter((result) => result.status === 'triggered'),
    ).toHaveLength(1)
    expect(processPendingCvs).toHaveBeenCalledOnce()
  })

  it('si n8n falla, "unavailable" y se puede reintentar enseguida', async () => {
    const log = silence()
    const { run, processPendingCvs } = setup({ pending: 2 })

    processPendingCvs.mockRejectedValueOnce(new Error('n8n caído'))

    expect(await run()).toEqual({ status: 'unavailable' })
    expect(await run()).toEqual({ status: 'triggered', pending: 2 })
    expect(log).toHaveBeenCalled()
  })

  it('sin la variable del webhook, "not_configured"', async () => {
    const { run, processPendingCvs } = setup({ pending: 1 })

    processPendingCvs.mockRejectedValueOnce(
      new WebhookNotConfiguredError('TALENT_N8N_PROCESS_CV_WEBHOOK_URL'),
    )

    expect(await run()).toEqual({ status: 'not_configured' })
  })
})

describe('reprocessCandidate', () => {
  const access = {
    id: CANDIDATE_ID,
    email: null,
    status: 'started',
    accessToken: null,
  }

  it('devuelve la fila a pending y lanza el procesado', async () => {
    const { admin, calls } = fakeAdminRepository({ access: [access] })
    const processPendingCvs = vi.fn(async () => ({
      status: 'triggered' as const,
      pending: 1,
    }))

    const result = await makeReprocessCandidate({ admin, processPendingCvs })(
      CANDIDATE_ID,
    )

    expect(result).toEqual({
      ok: true,
      processing: { status: 'triggered', pending: 1 },
    })
    expect(calls).toEqual(['findAccessById', 'requeueForProcessing'])
    expect(processPendingCvs).toHaveBeenCalledOnce()
  })

  it('si no se puede reprocesar, no lanza nada', async () => {
    const { admin } = fakeAdminRepository({
      access: [access],
      requeueResult: false,
    })
    const processPendingCvs = vi.fn()

    expect(
      await makeReprocessCandidate({ admin, processPendingCvs })(CANDIDATE_ID),
    ).toEqual({ ok: false, reason: 'not_reprocessable' })
    expect(processPendingCvs).not.toHaveBeenCalled()
  })

  it('un candidato que no existe es "not_found"', async () => {
    const { admin } = fakeAdminRepository()

    expect(
      await makeReprocessCandidate({ admin, processPendingCvs: vi.fn() })(
        CANDIDATE_ID,
      ),
    ).toEqual({ ok: false, reason: 'not_found' })
  })

  it('si el procesado está ocupado, la fila queda pending y se dice', async () => {
    const { admin } = fakeAdminRepository({ access: [access] })
    const busy = {
      status: 'busy' as const,
      reason: 'in_progress' as const,
      pending: 4,
    }

    expect(
      await makeReprocessCandidate({
        admin,
        processPendingCvs: async () => busy,
      })(CANDIDATE_ID),
    ).toEqual({ ok: true, processing: busy })
  })

  it('un fallo de la base es "unavailable"', async () => {
    const log = silence()
    const { admin, failOn } = fakeAdminRepository({ access: [access] })

    failOn.add('requeueForProcessing')

    expect(
      await makeReprocessCandidate({ admin, processPendingCvs: vi.fn() })(
        CANDIDATE_ID,
      ),
    ).toEqual({ ok: false, reason: 'unavailable' })
    expect(log).toHaveBeenCalled()
  })
})

describe('resendFormLink', () => {
  function setup(access: Parameters<typeof fakeAdminRepository>[0]) {
    const repo = fakeAdminRepository(access)
    const { workflows, sendFormLink } = fakeWorkflows()

    return {
      ...repo,
      sendFormLink,
      resend: makeResendFormLink({
        admin: repo.admin,
        workflows,
        newToken: () => UUID,
      }),
    }
  }

  const base = {
    id: CANDIDATE_ID,
    email: 'ada@example.com',
    status: 'sent',
    accessToken: 'tok-1',
  }

  it('reenvía el enlace con el token que ya tiene y renueva su vigencia', async () => {
    const { resend, sendFormLink, tokens } = setup({ access: [base] })

    expect(await resend(CANDIDATE_ID)).toEqual({ ok: true })
    expect(sendFormLink).toHaveBeenCalledWith('tok-1')
    // Se vuelve a guardar el mismo token: es lo que abre otra semana.
    expect(tokens).toEqual([{ id: CANDIDATE_ID, token: 'tok-1' }])
  })

  it('si la fila no tiene token, lo genera y lo guarda antes de enviar', async () => {
    const { resend, sendFormLink, tokens, calls } = setup({
      access: [{ ...base, accessToken: null }],
    })

    await resend(CANDIDATE_ID)

    expect(tokens).toEqual([{ id: CANDIDATE_ID, token: UUID }])
    expect(sendFormLink).toHaveBeenCalledWith(UUID)
    expect(calls).toContain('setAccessToken')
  })

  it.each(['pending', 'started'])(
    'no reenvía mientras n8n procesa la fila (%s)',
    async (status) => {
      const { resend, sendFormLink } = setup({
        access: [{ ...base, status }],
      })

      expect(await resend(CANDIDATE_ID)).toEqual({
        ok: false,
        reason: 'in_process',
      })
      expect(sendFormLink).not.toHaveBeenCalled()
    },
  )

  it('sin email no hay a quién enviarlo', async () => {
    const { resend, sendFormLink } = setup({
      access: [{ ...base, email: null }],
    })

    expect(await resend(CANDIDATE_ID)).toEqual({
      ok: false,
      reason: 'no_email',
    })
    expect(sendFormLink).not.toHaveBeenCalled()
  })

  it('un candidato que no existe es "not_found"', async () => {
    expect(await setup({}).resend(CANDIDATE_ID)).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })

  it('si falla n8n, "unavailable"', async () => {
    const log = silence()
    const { resend, sendFormLink } = setup({ access: [base] })

    sendFormLink.mockRejectedValueOnce(new Error('n8n caído'))

    expect(await resend(CANDIDATE_ID)).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(log).toHaveBeenCalled()
  })
})
