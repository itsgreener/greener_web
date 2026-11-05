import { describe, expect, it, vi } from 'vitest'

import { makePrepareStaffCvUpload } from '@/modules/talent/application/prepareStaffCvUpload'
import { makeProcessPendingCvs } from '@/modules/talent/application/processPendingCvs'
import { makeRegisterStaffCv } from '@/modules/talent/application/registerStaffCv'
import { makeReprocessCandidate } from '@/modules/talent/application/reprocessCandidate'
import { makeResendFormLink } from '@/modules/talent/application/resendFormLink'
import { makeResolveCvLink } from '@/modules/talent/application/resolveCvLink'
import { WebhookNotConfiguredError } from '@/modules/talent/domain/talentErrors'
import {
  CANDIDATE_ID,
  FILE_BYTES,
  fakeAdminRepository,
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

describe('prepareStaffCvUpload', () => {
  function setup() {
    const { storage, createSignedUploadUrl } = fakeStorage()
    const prepareStaffCvUpload = makePrepareStaffCvUpload({
      storage,
      newId: () => UUID,
    })

    return { createSignedUploadUrl, prepareStaffCvUpload }
  }

  it('da una URL firmada para uploads/<uuid>.<ext> y el tipo de la extensión', async () => {
    const { prepareStaffCvUpload, createSignedUploadUrl } = setup()

    expect(
      await prepareStaffCvUpload({
        name: 'Mi CV (final).PDF',
        size: 4_000_000,
      }),
    ).toEqual({
      ok: true,
      path: `uploads/${UUID}.pdf`,
      signedUrl: `https://signed.example/upload/uploads/${UUID}.pdf?token=t`,
      contentType: 'application/pdf',
    })
    expect(createSignedUploadUrl).toHaveBeenCalledWith(`uploads/${UUID}.pdf`)
  })

  it('el nombre del fichero no llega a Storage', async () => {
    const { prepareStaffCvUpload, createSignedUploadUrl } = setup()

    await prepareStaffCvUpload({
      name: 'Ñandú ../ con espacios.pdf',
      size: 10,
    })

    expect(createSignedUploadUrl.mock.calls[0][0]).toBe(`uploads/${UUID}.pdf`)
  })

  it('admite justo 10 MB, el tope del personal (más que los 3,5 MB del formulario público)', async () => {
    const { prepareStaffCvUpload } = setup()

    expect(
      (await prepareStaffCvUpload({ name: 'a.pdf', size: 10_000_000 })).ok,
    ).toBe(true)
    expect(
      await prepareStaffCvUpload({ name: 'a.pdf', size: 10_000_001 }),
    ).toEqual({
      ok: false,
      reason: 'file_rejected',
      rejection: 'file_too_large',
    })
  })

  it.each([
    ['vacío', 'cv.pdf', 0, 'file_empty'],
    ['de tamaño no válido', 'cv.pdf', Number.NaN, 'file_empty'],
    ['con extensión no admitida', 'cv.exe', 10, 'file_type'],
    ['sin extensión', 'cv', 10, 'file_type'],
  ])(
    'rechaza un fichero %s sin pedir URL',
    async (_name, name, size, rejection) => {
      const { prepareStaffCvUpload, createSignedUploadUrl } = setup()

      expect(await prepareStaffCvUpload({ name, size })).toEqual({
        ok: false,
        reason: 'file_rejected',
        rejection,
      })
      expect(createSignedUploadUrl).not.toHaveBeenCalled()
    },
  )

  it('si Storage no da la URL, devuelve unavailable y lo registra', async () => {
    const log = silence()
    const { prepareStaffCvUpload, createSignedUploadUrl } = setup()

    createSignedUploadUrl.mockRejectedValueOnce(new Error('caído'))

    expect(await prepareStaffCvUpload({ name: 'cv.pdf', size: 10 })).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(log).toHaveBeenCalled()
  })
})

describe('registerStaffCv', () => {
  const PATH = `uploads/${UUID}.pdf`

  function setup(
    objects: Record<string, Uint8Array> = { [PATH]: FILE_BYTES.pdf },
  ) {
    const repo = fakeAdminRepository()
    const { storage, remove, download } = fakeStorage(objects)
    const registerStaffCv = makeRegisterStaffCv({ admin: repo.admin, storage })

    return { ...repo, remove, download, registerStaffCv }
  }

  it('lee el objeto y crea una fila pending con la ruta y quien la sube', async () => {
    const { registerStaffCv, remove, download, staffRows } = setup()

    expect(await registerStaffCv(PATH, 'ana@itsgreener.com')).toEqual({
      ok: true,
      candidateId: expect.any(String),
      bytes: FILE_BYTES.pdf.byteLength,
    })
    expect(download).toHaveBeenCalledWith(PATH)
    expect(remove).not.toHaveBeenCalled()
    expect(staffRows).toEqual([
      { status: 'pending', file_path: PATH, uploaded_by: 'ana@itsgreener.com' },
    ])
  })

  it.each([
    ['vacío', new Uint8Array(), 'file_empty'],
    ['de más de 10 MB', new Uint8Array(10_000_001), 'file_too_large'],
    [
      'con contenido que no es lo que dice la extensión',
      FILE_BYTES.text,
      'file_type',
    ],
    ['un png con extensión pdf', FILE_BYTES.png, 'file_type'],
  ])(
    'un fichero %s se rechaza y se borra del bucket',
    async (_name, bytes, rejection) => {
      const { registerStaffCv, remove, calls } = setup({ [PATH]: bytes })

      expect(await registerStaffCv(PATH, 'ana@itsgreener.com')).toEqual({
        ok: false,
        reason: 'file_rejected',
        rejection,
      })
      expect(remove).toHaveBeenCalledWith(PATH)
      expect(calls).toEqual([])
    },
  )

  it.each([
    'uploads/../otro.pdf',
    'uploads/otra-carpeta/11111111-2222-4333-8444-555555555555.pdf',
    `otro/${UUID}.pdf`,
    `uploads/${UUID}.exe`,
    `uploads/${UUID}.pdf/../../x.pdf`,
    'uploads/no-es-un-uuid.pdf',
    '',
  ])(
    'una ruta con forma ajena (%s) no toca nada: ni lee, ni borra, ni crea fila',
    async (path) => {
      const { registerStaffCv, remove, download, calls } = setup()

      expect(await registerStaffCv(path, 'ana@itsgreener.com')).toEqual({
        ok: false,
        reason: 'file_rejected',
        rejection: 'file_type',
      })
      expect(download).not.toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
      expect(calls).toEqual([])
    },
  )

  it('si el objeto no está en el bucket (la subida falló), unavailable y sin fila', async () => {
    const log = silence()
    const { registerStaffCv, calls } = setup({})

    expect(await registerStaffCv(PATH, 'ana@itsgreener.com')).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(calls).toEqual([])
    expect(log).toHaveBeenCalled()
  })

  it('si falla la fila, borra el objeto del bucket (no deja CVs huérfanos)', async () => {
    const log = silence()
    const { registerStaffCv, remove, failOn } = setup()

    failOn.add('insertStaffCandidate')

    expect(await registerStaffCv(PATH, 'ana@itsgreener.com')).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(remove).toHaveBeenCalledWith(PATH)
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
