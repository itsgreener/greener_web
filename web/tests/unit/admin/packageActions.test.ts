import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/packages/application/uploadHtmlPackage', () => ({
  uploadHtmlPackage: vi.fn(),
}))

vi.mock(
  '@/modules/packages/application/publishHtmlPackageVersion',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/modules/packages/application/publishHtmlPackageVersion')
      >()

    return {
      ...actual,
      publishHtmlPackageVersion: vi.fn(),
    }
  },
)

vi.mock('@/modules/packages/infrastructure/zipValidation', () => ({
  PackageValidationError: class PackageValidationError extends Error {
    issues: string[]
    constructor(issues: string[]) {
      super(issues.join(' — '))
      this.issues = issues
    }
  },
}))

vi.mock('@/modules/packages/infrastructure/cloudmersiveVirusScan', () => ({
  VirusScanError: class VirusScanError extends Error {},
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

describe('uploadHtmlPackageAction', () => {
  it('con contentId y archivo válidos, sube y devuelve success', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')

    vi.mocked(uploadHtmlPackage).mockResolvedValue(VERSION_ID)

    const file = new File(['contenido'], 'package.zip', {
      type: 'application/zip',
    })

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, file }),
    )

    expect(result.success).toBe(true)
    expect(uploadHtmlPackage).toHaveBeenCalledOnce()
    expect(vi.mocked(uploadHtmlPackage).mock.calls[0][0]).toBe(CONTENT_ID)
  })

  it('sin archivo, no llega a llamar a uploadHtmlPackage', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID }),
    )

    expect(result.error).toBeTruthy()
    expect(uploadHtmlPackage).not.toHaveBeenCalled()
  })

  it('con contentId vacío, no llega a llamar a uploadHtmlPackage', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')

    const file = new File(['contenido'], 'package.zip')

    const result = await uploadHtmlPackageAction({}, formData({ file }))

    expect(result.error).toBeTruthy()
    expect(uploadHtmlPackage).not.toHaveBeenCalled()
  })

  it('si uploadHtmlPackage lanza PackageValidationError, expone los issues', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')
    const { PackageValidationError } =
      await import('@/modules/packages/infrastructure/zipValidation')

    vi.mocked(uploadHtmlPackage).mockRejectedValue(
      new PackageValidationError([
        'Falta index.html',
        'manifest.json inválido',
      ]),
    )

    const file = new File(['contenido'], 'package.zip')

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, file }),
    )

    expect(result.error).toBeTruthy()
    expect(result.issues).toEqual([
      'Falta index.html',
      'manifest.json inválido',
    ])
  })

  it('si uploadHtmlPackage lanza VirusScanError, usa su mensaje y no expone issues', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')
    const { VirusScanError } =
      await import('@/modules/packages/infrastructure/cloudmersiveVirusScan')

    vi.mocked(uploadHtmlPackage).mockRejectedValue(
      new VirusScanError(
        'El escaneo antivirus ha encontrado contenido malicioso.',
      ),
    )

    const file = new File(['contenido'], 'package.zip')

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, file }),
    )

    expect(result.error).toBe(
      'El escaneo antivirus ha encontrado contenido malicioso.',
    )
    expect(result.issues).toBeUndefined()
  })

  it('si uploadHtmlPackage lanza un error genérico, no expone issues', async () => {
    const { uploadHtmlPackageAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')

    vi.mocked(uploadHtmlPackage).mockRejectedValue(new Error('fallo de red'))

    const file = new File(['contenido'], 'package.zip')

    const result = await uploadHtmlPackageAction(
      {},
      formData({ contentId: CONTENT_ID, file }),
    )

    expect(result.error).toBeTruthy()
    expect(result.issues).toBeUndefined()
  })
})

describe('publishHtmlPackageVersionAction', () => {
  it('con datos válidos, publica y devuelve success', async () => {
    const { publishHtmlPackageVersionAction } =
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { publishHtmlPackageVersion } =
      await import('@/modules/packages/application/publishHtmlPackageVersion')

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
      await import('@/app/admin/contents/[id]/edit/packageActions')
    const { publishHtmlPackageVersion } =
      await import('@/modules/packages/application/publishHtmlPackageVersion')

    const result = await publishHtmlPackageVersionAction(
      {},
      formData({ contentId: CONTENT_ID, versionId: 'no-es-uuid' }),
    )

    expect(result.error).toBeTruthy()
    expect(publishHtmlPackageVersion).not.toHaveBeenCalled()
  })
})
