import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-3f2e-8d0c-b9a8f7e6d5c4'

const VALID_MANIFEST = {
  kind: 'tool' as const,
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: [],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
}

vi.mock(
  '@/modules/packages/infrastructure/supabaseHtmlPackageRepository',
  () => ({
    supabaseHtmlPackageRepository: {
      uploadVersion: vi.fn(),
      publishVersion: vi.fn(),
      listVersions: vi.fn(),
    },
  }),
)

vi.mock('@/modules/packages/infrastructure/zipValidation', () => ({
  validateHtmlPackageZip: vi.fn(),
  PackageValidationError: class PackageValidationError extends Error {
    issues: string[]
    constructor(issues: string[]) {
      super(issues.join(' — '))
      this.issues = issues
    }
  },
}))

vi.mock('@/modules/packages/infrastructure/cloudmersiveVirusScan', () => ({
  scanZipForViruses: vi.fn(),
  VirusScanError: class VirusScanError extends Error {},
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('uploadHtmlPackage', () => {
  it('valida el ZIP, lo escanea, y delega en supabaseHtmlPackageRepository.uploadVersion con lo ya validado', async () => {
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')
    const { validateHtmlPackageZip } =
      await import('@/modules/packages/infrastructure/zipValidation')
    const { scanZipForViruses } =
      await import('@/modules/packages/infrastructure/cloudmersiveVirusScan')
    const { supabaseHtmlPackageRepository } =
      await import('@/modules/packages/infrastructure/supabaseHtmlPackageRepository')

    const entries = [{ path: 'index.html', data: Buffer.from('<h1>Hola</h1>') }]

    vi.mocked(validateHtmlPackageZip).mockReturnValue({
      manifest: VALID_MANIFEST,
      entries,
      checksum: 'abc123',
    })
    vi.mocked(scanZipForViruses).mockResolvedValue(undefined)
    vi.mocked(supabaseHtmlPackageRepository.uploadVersion).mockResolvedValue(
      VERSION_ID,
    )

    const zipBuffer = Buffer.from('contenido-del-zip')
    const result = await uploadHtmlPackage(CONTENT_ID, zipBuffer)

    expect(result).toBe(VERSION_ID)
    expect(validateHtmlPackageZip).toHaveBeenCalledWith(zipBuffer)
    expect(scanZipForViruses).toHaveBeenCalledWith(zipBuffer)
    expect(supabaseHtmlPackageRepository.uploadVersion).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      entries,
      manifest: VALID_MANIFEST,
      checksum: 'abc123',
    })
  })

  it('si la validación del ZIP lanza, no llega a llamar al repositorio', async () => {
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')
    const { validateHtmlPackageZip, PackageValidationError } =
      await import('@/modules/packages/infrastructure/zipValidation')
    const { supabaseHtmlPackageRepository } =
      await import('@/modules/packages/infrastructure/supabaseHtmlPackageRepository')

    vi.mocked(validateHtmlPackageZip).mockImplementation(() => {
      throw new PackageValidationError(['Falta index.html'])
    })

    await expect(
      uploadHtmlPackage(CONTENT_ID, Buffer.from('zip-malo')),
    ).rejects.toThrow('Falta index.html')

    expect(supabaseHtmlPackageRepository.uploadVersion).not.toHaveBeenCalled()
  })

  it('si el escaneo antivirus lanza (infectado, o el servicio no responde), no llega a llamar al repositorio — bloqueante a propósito', async () => {
    const { uploadHtmlPackage } =
      await import('@/modules/packages/application/uploadHtmlPackage')
    const { validateHtmlPackageZip } =
      await import('@/modules/packages/infrastructure/zipValidation')
    const { scanZipForViruses, VirusScanError } =
      await import('@/modules/packages/infrastructure/cloudmersiveVirusScan')
    const { supabaseHtmlPackageRepository } =
      await import('@/modules/packages/infrastructure/supabaseHtmlPackageRepository')

    const entries = [{ path: 'index.html', data: Buffer.from('<h1>Hola</h1>') }]

    vi.mocked(validateHtmlPackageZip).mockReturnValue({
      manifest: VALID_MANIFEST,
      entries,
      checksum: 'abc123',
    })
    vi.mocked(scanZipForViruses).mockRejectedValue(
      new VirusScanError(
        'El escaneo antivirus ha encontrado contenido malicioso.',
      ),
    )

    await expect(
      uploadHtmlPackage(CONTENT_ID, Buffer.from('zip-infectado')),
    ).rejects.toThrow('contenido malicioso')

    expect(supabaseHtmlPackageRepository.uploadVersion).not.toHaveBeenCalled()
  })
})

describe('publishHtmlPackageVersion', () => {
  it('valida con zod y delega en supabaseHtmlPackageRepository.publishVersion', async () => {
    const { publishHtmlPackageVersion } =
      await import('@/modules/packages/application/publishHtmlPackageVersion')
    const { supabaseHtmlPackageRepository } =
      await import('@/modules/packages/infrastructure/supabaseHtmlPackageRepository')

    vi.mocked(supabaseHtmlPackageRepository.publishVersion).mockResolvedValue(
      VERSION_ID,
    )

    const result = await publishHtmlPackageVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(result).toBe(VERSION_ID)
    expect(supabaseHtmlPackageRepository.publishVersion).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })
  })

  it('rechaza un contentId inválido sin llamar al repositorio', async () => {
    const { publishHtmlPackageVersion } =
      await import('@/modules/packages/application/publishHtmlPackageVersion')
    const { supabaseHtmlPackageRepository } =
      await import('@/modules/packages/infrastructure/supabaseHtmlPackageRepository')

    await expect(
      publishHtmlPackageVersion({
        contentId: 'no-es-uuid',
        versionId: VERSION_ID,
      }),
    ).rejects.toThrow()

    expect(supabaseHtmlPackageRepository.publishVersion).not.toHaveBeenCalled()
  })
})

describe('listHtmlPackageVersions', () => {
  it('delega en supabaseHtmlPackageRepository.listVersions', async () => {
    const { listHtmlPackageVersions } =
      await import('@/modules/packages/application/listHtmlPackageVersions')
    const { supabaseHtmlPackageRepository } =
      await import('@/modules/packages/infrastructure/supabaseHtmlPackageRepository')

    const versions = [
      {
        id: VERSION_ID,
        version: 1,
        status: 'published' as const,
        createdAt: '2026-09-08T10:00:00.000Z',
        storagePath: `${CONTENT_ID}/v1`,
      },
    ]

    vi.mocked(supabaseHtmlPackageRepository.listVersions).mockResolvedValue(
      versions,
    )

    const result = await listHtmlPackageVersions(CONTENT_ID)

    expect(result).toEqual(versions)
    expect(supabaseHtmlPackageRepository.listVersions).toHaveBeenCalledWith(
      CONTENT_ID,
    )
  })
})
