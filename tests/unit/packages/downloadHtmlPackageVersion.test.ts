import AdmZip from 'adm-zip'
import { describe, expect, it, vi } from 'vitest'

import { makeDownloadHtmlPackageVersion } from '@/modules/packages/application/downloadHtmlPackageVersion'
import {
  MAX_PACKAGE_DOWNLOAD_BYTES,
  orderPackageFiles,
  packageDownloadFileName,
  type PackageVersionFile,
} from '@/modules/packages/domain/packageDownload'
import { PackageDownloadTooLargeError } from '@/modules/packages/domain/packageErrors'
import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import { zipPackageBuilder } from '@/modules/packages/infrastructure/zipPackageBuilder'
import { validateHtmlPackageZip } from '@/modules/packages/infrastructure/zipValidation'
import {
  OG_IMAGE_PATH,
  VALID_METADATA,
  pngBytes,
} from '@tests/helpers/packageFixtures'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-4f2e-8d0c-b9a8f7e6d5c4'

const MANIFEST = {
  kind: 'tool',
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: [],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
  metadata: VALID_METADATA,
}

/** Los ficheros de una versión tal y como los guarda Storage (sin el ZIP). */
function storedFiles(): PackageVersionFile[] {
  return [
    { path: `assets/img/logo.png`, data: Buffer.from([1, 2, 3, 4]) },
    { path: OG_IMAGE_PATH, data: pngBytes() },
    { path: 'manifest.json', data: Buffer.from(JSON.stringify(MANIFEST)) },
    { path: 'assets/main.js', data: Buffer.from('console.log("hola")') },
    { path: 'index.html', data: Buffer.from('<h1>Hola</h1>') },
  ]
}

function makeUseCase(
  read = vi.fn(async () => ({
    slug: 'pixel-palette',
    version: 3,
    files: storedFiles(),
  })),
) {
  return {
    read,
    download: makeDownloadHtmlPackageVersion({
      reader: { read },
      zipBuilder: zipPackageBuilder,
    }),
  }
}

describe('packageDownloadFileName', () => {
  it('es <slug>-v<n>.zip', () => {
    expect(packageDownloadFileName('pixel-palette', 3)).toBe(
      'pixel-palette-v3.zip',
    )
  })

  it.each([
    ['con mayúsculas', 'Pixel Palette', 'pixel-palette-v1.zip'],
    ['con comillas y barras (cabecera HTTP)', 'a"b/c\\d', 'a-b-c-d-v1.zip'],
    ['con saltos de línea', 'a\r\nSet-Cookie: x', 'a-set-cookie-x-v1.zip'],
    ['sin nada aprovechable', '///', 'paquete-v1.zip'],
    ['con puntos al borde', '..hola..', 'hola-v1.zip'],
  ])('sanea el slug %s', (_label, slug, expected) => {
    expect(packageDownloadFileName(slug, 1)).toBe(expected)
  })
})

describe('orderPackageFiles', () => {
  it('index.html y manifest.json primero, el resto por ruta, sin tocar la entrada', () => {
    const input = storedFiles()
    const before = input.map((file) => file.path)

    expect(orderPackageFiles(input).map((file) => file.path)).toEqual([
      'index.html',
      'manifest.json',
      'assets/img/logo.png',
      'assets/main.js',
      OG_IMAGE_PATH,
    ])
    expect(input.map((file) => file.path)).toEqual(before)
  })
})

describe('zipPackageBuilder', () => {
  it('guarda cada fichero con su ruta y su contenido exactos', () => {
    const zip = new AdmZip(zipPackageBuilder.build(storedFiles()))

    for (const file of storedFiles()) {
      expect(zip.readFile(file.path)?.equals(file.data)).toBe(true)
    }

    expect(zip.getEntries().map((entry) => entry.entryName)).toHaveLength(5)
  })

  it('todas las entradas son ficheros regulares, sin symlinks', () => {
    const zip = new AdmZip(zipPackageBuilder.build(storedFiles()))

    for (const entry of zip.getEntries()) {
      const unixMode = (entry.header.attr >>> 16) & 0xffff

      expect(unixMode & 0xf000).toBe(0x8000)
    }
  })
})

describe('downloadHtmlPackageVersion', () => {
  it('devuelve el ZIP con el nombre <slug>-v<n>.zip', async () => {
    const { download, read } = makeUseCase()

    const result = await download({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(read).toHaveBeenCalledWith(CONTENT_ID, VERSION_ID)
    expect(result?.fileName).toBe('pixel-palette-v3.zip')
    expect(result?.zip.subarray(0, 2).toString('latin1')).toBe('PK')
  })

  it('el ZIP descargado supera la validación de la subida y conserva el manifest tal cual', async () => {
    const { download } = makeUseCase()

    const result = await download({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })
    const validated = validateHtmlPackageZip(result!.zip)

    expect(validated.manifest.kind).toBe('tool')
    expect(validated.manifest.metadata.title).toBe(VALID_METADATA.title)
    expect(validated.entries.map((entry) => entry.path).sort()).toEqual(
      storedFiles()
        .map((file) => file.path)
        .sort(),
    )

    for (const file of storedFiles()) {
      expect(
        validated.entries.find((entry) => entry.path === file.path)?.data,
      ).toEqual(file.data)
    }
  })

  it('un ZIP descargado y vuelto a subir da el mismo checksum', async () => {
    const { download } = makeUseCase()

    const first = await download({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })
    const second = await download({
      contentId: CONTENT_ID,
      versionId: VERSION_ID,
    })

    expect(validateHtmlPackageZip(first!.zip).checksum).toBe(
      validateHtmlPackageZip(second!.zip).checksum,
    )
  })

  it('devuelve null si la versión no existe o no es de ese contenido', async () => {
    const { download } = makeUseCase(vi.fn(async () => null) as never)

    expect(
      await download({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    ).toBeNull()
  })

  it('devuelve null si la versión no tiene ficheros: no se entrega un ZIP vacío', async () => {
    const { download } = makeUseCase(
      vi.fn(async () => ({ slug: 'x', version: 1, files: [] })) as never,
    )

    expect(
      await download({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    ).toBeNull()
  })

  it('un ZIP más grande de lo que cabe en una respuesta lanza el error con su tamaño', async () => {
    const big = Buffer.alloc(MAX_PACKAGE_DOWNLOAD_BYTES + 1)
    const download = makeDownloadHtmlPackageVersion({
      reader: {
        read: async () => ({ slug: 'x', version: 1, files: storedFiles() }),
      },
      zipBuilder: { build: () => big },
    })

    await expect(
      download({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    ).rejects.toMatchObject({
      name: 'PackageDownloadTooLargeError',
      bytes: big.byteLength,
    })
    await expect(
      download({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    ).rejects.toBeInstanceOf(PackageDownloadTooLargeError)
  })

  it('justo en el tope sí se entrega', async () => {
    const edge = Buffer.alloc(MAX_PACKAGE_DOWNLOAD_BYTES)
    const download = makeDownloadHtmlPackageVersion({
      reader: {
        read: async () => ({ slug: 'x', version: 1, files: storedFiles() }),
      },
      zipBuilder: { build: () => edge },
    })

    expect(
      (await download({ contentId: CONTENT_ID, versionId: VERSION_ID }))?.zip,
    ).toBe(edge)
  })

  it.each([
    [{ contentId: 'x', versionId: VERSION_ID }],
    [{ contentId: CONTENT_ID, versionId: 'y' }],
    [{}],
    [null],
  ])('ids no válidos (%j) no llegan al lector', async (input) => {
    const { download, read } = makeUseCase()

    await expect(download(input)).rejects.toThrow()
    expect(read).not.toHaveBeenCalled()
  })

  it('un fallo del lector se propaga (no se entrega un ZIP a medias)', async () => {
    const { download } = makeUseCase(
      vi.fn(async () => {
        throw new Error('Storage caído')
      }) as never,
    )

    await expect(
      download({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    ).rejects.toThrow('Storage caído')
  })
})

describe('el tope de la respuesta', () => {
  it('deja margen sobre el máximo de la subida y queda por debajo de los 4,5 MB de la plataforma', () => {
    expect(MAX_PACKAGE_DOWNLOAD_BYTES).toBeGreaterThan(
      PACKAGE_LIMITS.maxZipSizeBytes,
    )
    expect(MAX_PACKAGE_DOWNLOAD_BYTES).toBeLessThan(4_500_000)
  })
})
