import { beforeEach, describe, expect, it, vi } from 'vitest'

import { makeDeleteCandidateFile } from '@/modules/talent/application/deleteCandidateFile'
import { makeUploadCandidateFile } from '@/modules/talent/application/uploadCandidateFile'
import { TALENT_FILE_LIMITS } from '@/modules/talent/domain/talentConstants'
import { FileScanRejectedError } from '@/modules/talent/domain/talentErrors'
import {
  CONTEXT,
  FILE_BYTES,
  TOKEN,
  fakeRepository,
  fakeScanner,
  fakeStorage,
  limiter,
  openLimiters,
} from '@tests/helpers/talentFakes'

const FILE_ID = '99999999-9999-4999-8999-999999999999'
const CANDIDATE = {
  id: 'c1',
  email: 'a@b.co',
  status: 'sent',
  accessToken: TOKEN,
}

function setup(limiters = openLimiters()) {
  const repo = fakeRepository([CANDIDATE])
  const { storage, upload, remove } = fakeStorage()
  const { scanner, scan } = fakeScanner()
  const upl = makeUploadCandidateFile({
    repository: repo.repository,
    storage,
    scanner,
    limiters,
    newId: () => FILE_ID,
  })
  const del = makeDeleteCandidateFile({
    repository: repo.repository,
    storage,
    limiters,
  })

  return { ...repo, upload, remove, scan, upl, del }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('uploadCandidateFile', () => {
  it('guarda en uploads/<uuid>.<ext> con el tipo real y registra la fila', async () => {
    const { upl, upload, insertedFiles, scan } = setup()

    const result = await upl(
      TOKEN,
      { name: 'Mi CV (final).PDF', bytes: FILE_BYTES.pdf },
      CONTEXT,
    )

    expect(result).toMatchObject({ ok: true, file: { extension: 'pdf' } })
    expect(upload).toHaveBeenCalledExactlyOnceWith(
      `uploads/${FILE_ID}.pdf`,
      FILE_BYTES.pdf,
      'application/pdf',
    )
    expect(insertedFiles).toEqual([
      {
        candidate_id: 'c1',
        path: `uploads/${FILE_ID}.pdf`,
        access_token: TOKEN,
      },
    ])
    expect(scan).toHaveBeenCalledTimes(1)
  })

  it('el nombre que manda el visitante no llega al bucket ni a la base', async () => {
    const { upl, upload, insertedFiles } = setup()

    await upl(
      TOKEN,
      { name: '../../ñandú con espacios.docx', bytes: FILE_BYTES.docx },
      CONTEXT,
    )

    expect(JSON.stringify([upload.mock.calls, insertedFiles])).not.toMatch(
      /ñandú|espacios|\.\./,
    )
  })

  it.each([
    ['pdf', FILE_BYTES.pdf],
    ['doc', FILE_BYTES.doc],
    ['docx', FILE_BYTES.docx],
    ['png', FILE_BYTES.png],
    ['jpg', FILE_BYTES.jpeg],
    ['jpeg', FILE_BYTES.jpeg],
    ['webp', FILE_BYTES.webp],
  ] as const)('acepta .%s', async (extension, bytes) => {
    const { upl } = setup()

    expect(
      await upl(TOKEN, { name: `f.${extension}`, bytes }, CONTEXT),
    ).toMatchObject({ ok: true })
  })

  it('rechaza una extensión permitida con contenido de otra cosa', async () => {
    const { upl, upload } = setup()

    for (const bytes of [FILE_BYTES.text, FILE_BYTES.png, FILE_BYTES.docx]) {
      expect(await upl(TOKEN, { name: 'cv.pdf', bytes }, CONTEXT)).toEqual({
        ok: false,
        reason: 'file_rejected',
        rejection: 'file_type',
      })
    }
    expect(upload).not.toHaveBeenCalled()
  })

  it.each(['cv.exe', 'cv.html', 'cv', 'cv.svg', 'cv.pdf.js'])(
    'rechaza la extensión de %s',
    async (name) => {
      const { upl } = setup()

      expect(
        await upl(TOKEN, { name, bytes: FILE_BYTES.pdf }, CONTEXT),
      ).toMatchObject({
        rejection: 'file_type',
      })
    },
  )

  it('rechaza vacío y más de 3,5 MB sin escanear', async () => {
    const { upl, scan } = setup()
    const big = new Uint8Array(TALENT_FILE_LIMITS.maxFileBytes + 1)
    big.set(FILE_BYTES.pdf)

    expect(
      await upl(TOKEN, { name: 'a.pdf', bytes: new Uint8Array() }, CONTEXT),
    ).toMatchObject({
      rejection: 'file_empty',
    })
    expect(
      await upl(TOKEN, { name: 'a.pdf', bytes: big }, CONTEXT),
    ).toMatchObject({
      rejection: 'file_too_large',
    })
    expect(scan).not.toHaveBeenCalled()
  })

  it('acepta justo el tope de 3,5 MB', async () => {
    const { upl } = setup()
    const exact = new Uint8Array(TALENT_FILE_LIMITS.maxFileBytes)
    exact.set(FILE_BYTES.pdf)

    expect(
      await upl(TOKEN, { name: 'a.pdf', bytes: exact }, CONTEXT),
    ).toMatchObject({ ok: true })
  })

  it('máximo 10 ficheros sin procesar por candidato', async () => {
    const { upl, files } = setup()

    for (let i = 0; i < TALENT_FILE_LIMITS.maxFilesPerCandidate; i++) {
      files.push({
        id: `f${i}`,
        path: `uploads/${i}.pdf`,
        status: 'pending',
        candidate_id: 'c1',
      })
    }

    expect(
      await upl(TOKEN, { name: 'a.pdf', bytes: FILE_BYTES.pdf }, CONTEXT),
    ).toEqual({
      ok: false,
      reason: 'file_rejected',
      rejection: 'too_many_files',
    })
  })

  it('antivirus: si no da el fichero por limpio, no se guarda nada', async () => {
    const { upl, scan, upload, insertedFiles } = setup()
    scan.mockRejectedValueOnce(new FileScanRejectedError())

    expect(
      await upl(TOKEN, { name: 'a.pdf', bytes: FILE_BYTES.pdf }, CONTEXT),
    ).toEqual({
      ok: false,
      reason: 'file_rejected',
      rejection: 'file_scan',
    })
    expect(upload).not.toHaveBeenCalled()
    expect(insertedFiles).toEqual([])
  })

  it('si falla la fila en files, borra el objeto del bucket (no deja huérfanos)', async () => {
    const { upl, failOn, remove } = setup()
    failOn.add('insertFile')

    expect(
      await upl(TOKEN, { name: 'a.pdf', bytes: FILE_BYTES.pdf }, CONTEXT),
    ).toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(remove).toHaveBeenCalledExactlyOnceWith(`uploads/${FILE_ID}.pdf`)
  })

  it('token desconocido o mal formado: not_found sin tocar el bucket', async () => {
    const { upl, upload } = setup()

    expect(
      await upl(
        '00000000-0000-4000-8000-000000000000',
        { name: 'a.pdf', bytes: FILE_BYTES.pdf },
        CONTEXT,
      ),
    ).toEqual({
      ok: false,
      reason: 'not_found',
    })
    expect(
      await upl('x', { name: 'a.pdf', bytes: FILE_BYTES.pdf }, CONTEXT),
    ).toEqual({
      ok: false,
      reason: 'not_found',
    })
    expect(upload).not.toHaveBeenCalled()
  })

  it('límites por IP y por token', async () => {
    for (const key of ['uploadByIp', 'uploadByToken'] as const) {
      const { upl, upload } = setup(openLimiters({ [key]: limiter(0) }))

      expect(
        await upl(TOKEN, { name: 'a.pdf', bytes: FILE_BYTES.pdf }, CONTEXT),
      ).toEqual({
        ok: false,
        reason: 'rate_limited',
      })
      expect(upload).not.toHaveBeenCalled()
    }
  })
})

describe('deleteCandidateFile', () => {
  it('borra la fila y el objeto del bucket de un fichero propio sin procesar', async () => {
    const { del, files, remove } = setup()
    files.push({
      id: FILE_ID,
      path: 'uploads/x.pdf',
      status: 'pending',
      candidate_id: 'c1',
    })

    expect(await del(TOKEN, FILE_ID, CONTEXT)).toEqual({ ok: true })
    expect(files).toEqual([])
    expect(remove).toHaveBeenCalledExactlyOnceWith('uploads/x.pdf')
  })

  it('un fichero de otro candidato (o inexistente) es not_found y no se toca', async () => {
    const { del, files, remove } = setup()
    files.push({
      id: FILE_ID,
      path: 'uploads/x.pdf',
      status: 'pending',
      candidate_id: 'otro',
    })

    expect(await del(TOKEN, FILE_ID, CONTEXT)).toEqual({
      ok: false,
      reason: 'not_found',
    })
    expect(files).toHaveLength(1)
    expect(remove).not.toHaveBeenCalled()
  })

  it('si falla el borrado del objeto, la operación sigue siendo correcta (queda en el log)', async () => {
    const { del, files, remove } = setup()
    files.push({
      id: FILE_ID,
      path: 'uploads/x.pdf',
      status: 'pending',
      candidate_id: 'c1',
    })
    remove.mockRejectedValueOnce(new Error('storage'))

    expect(await del(TOKEN, FILE_ID, CONTEXT)).toEqual({ ok: true })
    expect(console.error).toHaveBeenCalled()
  })

  it('token mal formado: not_found', async () => {
    const { del } = setup()

    expect(await del('x', FILE_ID, CONTEXT)).toEqual({
      ok: false,
      reason: 'not_found',
    })
  })
})
