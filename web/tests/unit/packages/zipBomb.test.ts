import { describe, expect, it } from 'vitest'
import AdmZip from 'adm-zip'

import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import {
  PackageValidationError,
  validateHtmlPackageZip,
} from '@/modules/packages/infrastructure/zipValidation'

/**
 * Auditoría 8 oct, P0-3: el tope de 10 MB es del ZIP COMPRIMIDO. Un fichero
 * de ceros comprime casi a nada, así que sin tope de lo descomprimido un ZIP
 * minúsculo podía ocupar gigas en memoria al validarlo.
 */

const MANIFEST = Buffer.from(
  JSON.stringify({
    kind: 'tool',
    entrypoint: 'index.html',
    version: 1,
    requiredCapabilities: [],
    externalDomains: [],
    minViewport: { width: 320, height: 420 },
  }),
)

function baseZip(): AdmZip {
  const zip = new AdmZip()
  zip.addFile('manifest.json', MANIFEST)
  zip.addFile('index.html', Buffer.from('<h1>Hola</h1>'))
  return zip
}

describe('validateHtmlPackageZip — ZIP bomb', () => {
  it('rechaza un fichero que descomprimido supera el máximo por fichero, aunque el ZIP sea pequeño', () => {
    const zip = baseZip()
    zip.addFile(
      'assets/zeros.bin',
      Buffer.alloc(PACKAGE_LIMITS.maxEntryUncompressedBytes + 1),
    )

    const buffer = zip.toBuffer()

    expect(buffer.byteLength).toBeLessThan(PACKAGE_LIMITS.maxZipSizeBytes)
    expect(() => validateHtmlPackageZip(buffer)).toThrow(PackageValidationError)
    expect(() => validateHtmlPackageZip(buffer)).toThrow(/máximo por fichero/)
  })

  it('rechaza un ZIP cuyo total descomprimido supera el máximo', () => {
    const zip = baseZip()
    const perFile = PACKAGE_LIMITS.maxEntryUncompressedBytes - 1
    const files = Math.ceil(PACKAGE_LIMITS.maxUncompressedBytes / perFile) + 1

    for (let i = 0; i < files; i++) {
      zip.addFile(`assets/zeros-${i}.bin`, Buffer.alloc(perFile))
    }

    expect(() => validateHtmlPackageZip(zip.toBuffer())).toThrow(
      /contenido descomprimido/,
    )
  })

  it('rechaza un ZIP con demasiados ficheros', () => {
    const zip = baseZip()

    for (let i = 0; i < PACKAGE_LIMITS.maxEntries; i++) {
      zip.addFile(`assets/f-${i}.txt`, Buffer.from('x'))
    }

    expect(() => validateHtmlPackageZip(zip.toBuffer())).toThrow(
      /ficheros; el máximo/,
    )
  })
})
