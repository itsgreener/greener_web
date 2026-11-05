import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('@/modules/packages/container', () => ({
  prepareHtmlPackageUpload: vi.fn(),
  uploadStagedHtmlPackage: vi.fn(),
  publishHtmlPackageVersion: vi.fn(),
  deleteHtmlPackageVersion: vi.fn(),
  deleteOldHtmlPackageVersions: vi.fn(),
}))

function formData(entries: Record<string, FormDataEntryValue>) {
  const data = new FormData()

  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
})

const STAGED_PATH = `_incoming/${CONTENT_ID}/4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d.zip`

describe('prepareHtmlPackageUploadAction', () => {
  it('con un contentId válido, entrega la URL firmada del contenedor', async () => {
    const { prepareHtmlPackageUploadAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { prepareHtmlPackageUpload } =
      await import('@/modules/packages/container')

    vi.mocked(prepareHtmlPackageUpload).mockResolvedValue({
      bucket: 'html-packages',
      path: STAGED_PATH,
      token: 'tok',
    })

    const result = await prepareHtmlPackageUploadAction(CONTENT_ID)

    expect(result).toEqual({
      ok: true,
      bucket: 'html-packages',
      path: STAGED_PATH,
      token: 'tok',
    })
    expect(prepareHtmlPackageUpload).toHaveBeenCalledWith(CONTENT_ID)
  })

  it.each(['../otro/contenido', 'no-es-uuid', '123', 'a/b', ''])(
    'con contentId «%s» (no es uuid), no prepara nada',
    async (contentId) => {
      const { prepareHtmlPackageUploadAction } =
        await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
      const { prepareHtmlPackageUpload } =
        await import('@/modules/packages/container')

      const result = await prepareHtmlPackageUploadAction(contentId)

      expect(result).toEqual({
        ok: false,
        error: 'El identificador del contenido no es válido.',
      })
      expect(prepareHtmlPackageUpload).not.toHaveBeenCalled()
    },
  )

  it('si falla Storage, devuelve un mensaje genérico sin filtrar el detalle', async () => {
    const { prepareHtmlPackageUploadAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { prepareHtmlPackageUpload } =
      await import('@/modules/packages/container')

    vi.mocked(prepareHtmlPackageUpload).mockRejectedValue(
      new Error('detalle interno de Storage'),
    )

    const result = await prepareHtmlPackageUploadAction(CONTENT_ID)

    expect(result).toEqual({
      ok: false,
      error: 'No se ha podido preparar la subida.',
    })
  })
})

describe('uploadHtmlPackageAction', () => {
  it('con contentId y ruta de subida válidos, procesa el ZIP y devuelve success', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { uploadStagedHtmlPackage } =
      await import('@/modules/packages/container')

    vi.mocked(uploadStagedHtmlPackage).mockResolvedValue(VERSION_ID)

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, stagedPath: STAGED_PATH }),
    )

    expect(result.success).toBe(true)
    expect(uploadStagedHtmlPackage).toHaveBeenCalledWith(
      CONTENT_ID,
      STAGED_PATH,
    )
  })

  it('sin ruta de subida, no llega a procesar nada', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { uploadStagedHtmlPackage } =
      await import('@/modules/packages/container')

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID }),
    )

    expect(result.error).toBeTruthy()
    expect(uploadStagedHtmlPackage).not.toHaveBeenCalled()
  })

  // SEC-ADM-B2: la ruta de Storage se forma con este valor, así que tiene que
  // ser un uuid y no cualquier texto.
  it.each(['../otro/contenido', 'no-es-uuid', '123', 'a/b'])(
    'con contentId «%s» (no es uuid), no llega a procesar nada',
    async (contentId) => {
      const { uploadHtmlPackageAction } =
        await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
      const { uploadStagedHtmlPackage } =
        await import('@/modules/packages/container')

      const result = await uploadHtmlPackageAction(
        {},
        formData({ contentId, stagedPath: STAGED_PATH }),
      )

      expect(result.error).toBe('El identificador del contenido no es válido.')
      expect(uploadStagedHtmlPackage).not.toHaveBeenCalled()
    },
  )

  it('con contentId vacío, no llega a procesar nada', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { uploadStagedHtmlPackage } =
      await import('@/modules/packages/container')

    const result = await uploadHtmlPackageAction(
      {},
      formData({ stagedPath: STAGED_PATH }),
    )

    expect(result.error).toBeTruthy()
    expect(uploadStagedHtmlPackage).not.toHaveBeenCalled()
  })

  it('si el proceso lanza PackageValidationError, expone los issues', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { uploadStagedHtmlPackage } =
      await import('@/modules/packages/container')
    const { PackageValidationError } =
      await import('@/modules/packages/domain/packageErrors')

    vi.mocked(uploadStagedHtmlPackage).mockRejectedValue(
      new PackageValidationError([
        'Falta index.html',
        'manifest.json inválido',
      ]),
    )

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, stagedPath: STAGED_PATH }),
    )

    expect(result.error).toBeTruthy()
    expect(result.issues).toEqual([
      'Falta index.html',
      'manifest.json inválido',
    ])
  })

  it('si el proceso lanza VirusScanError, usa su mensaje y no expone issues', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { uploadStagedHtmlPackage } =
      await import('@/modules/packages/container')
    const { VirusScanError } =
      await import('@/modules/packages/domain/packageErrors')

    vi.mocked(uploadStagedHtmlPackage).mockRejectedValue(
      new VirusScanError(
        'El escaneo antivirus ha encontrado contenido malicioso.',
      ),
    )

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, stagedPath: STAGED_PATH }),
    )

    expect(result.error).toBe(
      'El escaneo antivirus ha encontrado contenido malicioso.',
    )
    expect(result.issues).toBeUndefined()
  })

  it('si el proceso lanza un error genérico, no expone issues', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { uploadStagedHtmlPackage } =
      await import('@/modules/packages/container')

    vi.mocked(uploadStagedHtmlPackage).mockRejectedValue(
      new Error('fallo de red'),
    )

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, stagedPath: STAGED_PATH }),
    )

    expect(result.error).toBeTruthy()
    expect(result.issues).toBeUndefined()
  })
})

describe('publishHtmlPackageVersionAction', () => {
  it('con datos válidos, publica y devuelve success', async () => {
    const { publishHtmlPackageVersionAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { publishHtmlPackageVersion } =
      await import('@/modules/packages/container')

    vi.mocked(publishHtmlPackageVersion).mockResolvedValue(VERSION_ID)

    const result = await publishHtmlPackageVersionAction(
      {},
      formData({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    )

    expect(result.success).toBe(true)
    expect(publishHtmlPackageVersion).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })
  })

  it('con un versionId inválido, no llega a llamar a publishHtmlPackageVersion', async () => {
    const { publishHtmlPackageVersionAction } =
      await import('@/app/admin/(panel)/contents/[id]/edit/packageActions')
    const { publishHtmlPackageVersion } =
      await import('@/modules/packages/container')

    const result = await publishHtmlPackageVersionAction(
      {},
      formData({ contentId: CONTENT_ID, versionId: 'no-es-uuid' }),
    )

    expect(result.error).toBeTruthy()
    expect(publishHtmlPackageVersion).not.toHaveBeenCalled()
  })
})
