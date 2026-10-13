import { describe, it, expect, vi } from 'vitest'

import { makePublishHtmlPackageVersion } from '@/modules/packages/application/publishHtmlPackageVersion'
import { makeUploadHtmlPackage } from '@/modules/packages/application/uploadHtmlPackage'
import {
  PackageValidationError,
  VirusScanError,
} from '@/modules/packages/domain/packageErrors'

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

/** Repositorio de paquetes falso: solo lo que usan estos casos de uso. */
function fakePackages() {
  return {
    uploadVersion: vi.fn(async () => VERSION_ID),
    publishVersion: vi.fn(async () => VERSION_ID),
    listVersions: vi.fn(),
    deleteVersion: vi.fn(),
  }
}

describe('uploadHtmlPackage', () => {
  it('valida el ZIP, lo escanea, y delega en el repositorio con lo ya validado', async () => {
    const packages = fakePackages()
    const entries = [{ path: 'index.html', data: Buffer.from('<h1>Hola</h1>') }]
    const validator = {
      validate: vi.fn(() => ({
        manifest: VALID_MANIFEST,
        entries,
        checksum: 'abc123',
      })),
    }
    const scanner = { scan: vi.fn(async () => {}) }
    const uploadHtmlPackage = makeUploadHtmlPackage({
      packages,
      validator,
      scanner,
    })

    const zipBuffer = Buffer.from('contenido-del-zip')
    const result = await uploadHtmlPackage(CONTENT_ID, zipBuffer)

    expect(result).toBe(VERSION_ID)
    expect(validator.validate).toHaveBeenCalledWith(zipBuffer)
    expect(scanner.scan).toHaveBeenCalledWith(zipBuffer)
    expect(packages.uploadVersion).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      entries,
      manifest: VALID_MANIFEST,
      checksum: 'abc123',
    })
  })

  it('si la validación del ZIP lanza, no escanea ni llega a llamar al repositorio', async () => {
    const packages = fakePackages()
    const scanner = { scan: vi.fn(async () => {}) }
    const uploadHtmlPackage = makeUploadHtmlPackage({
      packages,
      validator: {
        validate: () => {
          throw new PackageValidationError(['Falta index.html'])
        },
      },
      scanner,
    })

    await expect(
      uploadHtmlPackage(CONTENT_ID, Buffer.from('zip-malo')),
    ).rejects.toThrow('Falta index.html')

    expect(scanner.scan).not.toHaveBeenCalled()
    expect(packages.uploadVersion).not.toHaveBeenCalled()
  })

  it('si el escaneo antivirus lanza (infectado, o el servicio no responde), no llega a llamar al repositorio — bloqueante a propósito', async () => {
    const packages = fakePackages()
    const uploadHtmlPackage = makeUploadHtmlPackage({
      packages,
      validator: {
        validate: () => ({
          manifest: VALID_MANIFEST,
          entries: [{ path: 'index.html', data: Buffer.from('<h1>Hola</h1>') }],
          checksum: 'abc123',
        }),
      },
      scanner: {
        scan: async () => {
          throw new VirusScanError(
            'El escaneo antivirus ha encontrado contenido malicioso.',
          )
        },
      },
    })

    await expect(
      uploadHtmlPackage(CONTENT_ID, Buffer.from('zip-infectado')),
    ).rejects.toThrow('contenido malicioso')

    expect(packages.uploadVersion).not.toHaveBeenCalled()
  })
})

describe('publishHtmlPackageVersion', () => {
  it('valida con zod y delega en el repositorio', async () => {
    const packages = fakePackages()
    const publishHtmlPackageVersion = makePublishHtmlPackageVersion({
      packages,
    })

    const result = await publishHtmlPackageVersion({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(result).toBe(VERSION_ID)
    expect(packages.publishVersion).toHaveBeenCalledWith({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })
  })

  it('rechaza un contentId inválido sin llamar al repositorio', async () => {
    const packages = fakePackages()
    const publishHtmlPackageVersion = makePublishHtmlPackageVersion({
      packages,
    })

    await expect(
      publishHtmlPackageVersion({
        contentId: 'no-es-uuid',
        versionId: VERSION_ID,
      }),
    ).rejects.toThrow()

    expect(packages.publishVersion).not.toHaveBeenCalled()
  })
})
