import { describe, expect, it } from 'vitest'
import AdmZip from 'adm-zip'

import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import { validateHtmlPackageZip } from '@/modules/packages/infrastructure/zipValidation'
import {
  OG_IMAGE_PATH,
  VALID_METADATA,
  pngBytes,
} from '@tests/helpers/packageFixtures'

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
    metadata: VALID_METADATA,
  }),
)

function baseZip(): AdmZip {
  const zip = new AdmZip()
  zip.addFile('manifest.json', MANIFEST)
  zip.addFile('index.html', Buffer.from('<h1>Hola</h1>'))
  zip.addFile(OG_IMAGE_PATH, pngBytes())
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

/**
 * Plan de pendientes, B1: la bomba que MIENTE. Un ZIP puede declarar en su
 * cabecera (la local y la del directorio central) un tamaño descomprimido
 * pequeño y llevar dentro un flujo que al inflar ocupa muchísimo más. La
 * validación mira lo declarado, así que lo que protege es que la
 * descompresión se corte en lo declarado (adm-zip) y que ese corte acabe en
 * un rechazo limpio, no en una excepción suelta ni en gigas en memoria.
 */

/** Pone `declared` como tamaño descomprimido de una entrada, en ambas cabeceras. */
function lieAboutSize(buffer: Buffer, entryName: string, declared: number) {
  const patched = Buffer.from(buffer)
  const name = Buffer.from(entryName)
  let patches = 0

  for (let i = 0; i < patched.length - 4; i++) {
    const signature = patched.readUInt32LE(i)

    // Cabecera local: firma, 18 bytes hasta «tamaño descomprimido» (offset 22).
    if (signature === 0x04034b50) {
      const nameLength = patched.readUInt16LE(i + 26)
      if (patched.subarray(i + 30, i + 30 + nameLength).equals(name)) {
        patched.writeUInt32LE(declared, i + 22)
        patches++
      }
    }

    // Directorio central: tamaño descomprimido en el offset 24.
    if (signature === 0x02014b50) {
      const nameLength = patched.readUInt16LE(i + 28)
      if (patched.subarray(i + 46, i + 46 + nameLength).equals(name)) {
        patched.writeUInt32LE(declared, i + 24)
        patches++
      }
    }
  }

  expect(patches).toBe(2)

  return patched
}

describe('validateHtmlPackageZip — ZIP bomb que miente sobre su tamaño', () => {
  const REAL_BYTES = PACKAGE_LIMITS.maxEntryUncompressedBytes * 2

  function lyingZip(declared: number) {
    const zip = baseZip()
    zip.addFile('assets/bomb.bin', Buffer.alloc(REAL_BYTES))

    return lieAboutSize(zip.toBuffer(), 'assets/bomb.bin', declared)
  }

  it('la cabecera miente (declara 1 KB y hay el doble del tope por fichero): se rechaza con un error de validación, sin descomprimirlo entero', () => {
    const buffer = lyingZip(1024)

    expect(buffer.byteLength).toBeLessThan(PACKAGE_LIMITS.maxZipSizeBytes)
    expect(() => validateHtmlPackageZip(buffer)).toThrow(PackageValidationError)
  })

  it('declarar 0 bytes tampoco desactiva el tope', () => {
    const buffer = lyingZip(0)

    expect(() => validateHtmlPackageZip(buffer)).toThrow(PackageValidationError)
  })

  it('el mensaje al admin habla de un ZIP corrupto o inconsistente, sin volcar el error interno de la librería', () => {
    let message = ''

    try {
      validateHtmlPackageZip(lyingZip(1024))
    } catch (error) {
      message = (error as PackageValidationError).issues.join(' ')
    }

    expect(message).toMatch(/tamaño|corrupto|inconsistente/i)
    expect(message).not.toMatch(/maxOutputLength|ERR_/)
  })
})
