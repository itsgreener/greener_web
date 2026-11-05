import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  makePrepareHtmlPackageUpload,
  makeUploadStagedHtmlPackage,
} from '@/modules/packages/application/uploadHtmlPackage'
import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import {
  isStagedPackagePathFor,
  stagedPackagePath,
} from '@/modules/packages/domain/packageFiles'
import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const OTHER_CONTENT_ID = '11111111-2222-4333-8444-555555555555'
const UPLOAD_ID = '4f1b2c3d-5e6f-4a7b-8c9d-0e1f2a3b4c5d'
const PATH = stagedPackagePath(CONTENT_ID, UPLOAD_ID)

describe('ruta de la subida preparada', () => {
  it('se forma bajo _incoming/<contenido>/<subida>.zip', () => {
    expect(PATH).toBe(`_incoming/${CONTENT_ID}/${UPLOAD_ID}.zip`)
    expect(isStagedPackagePathFor(CONTENT_ID, PATH)).toBe(true)
  })

  it.each([
    ['la de otro contenido', stagedPackagePath(OTHER_CONTENT_ID, UPLOAD_ID)],
    ['una versión publicada', `${CONTENT_ID}/v1/index.html`],
    [
      'un recorrido hacia arriba',
      `_incoming/${CONTENT_ID}/../${CONTENT_ID}/v1/manifest.json`,
    ],
    ['sin extensión .zip', `_incoming/${CONTENT_ID}/${UPLOAD_ID}`],
    ['con otra extensión', `_incoming/${CONTENT_ID}/${UPLOAD_ID}.html`],
    ['con una subcarpeta de más', `_incoming/${CONTENT_ID}/x/${UPLOAD_ID}.zip`],
    ['vacía', ''],
  ])('rechaza %s', (_label, path) => {
    expect(isStagedPackagePathFor(CONTENT_ID, path)).toBe(false)
  })

  it.each([undefined, null, 42, {}, ['a']])(
    'rechaza lo que no es texto: %j',
    (v) => {
      expect(isStagedPackagePathFor(CONTENT_ID, v)).toBe(false)
    },
  )
})

function fakeStaging(zip: Buffer = Buffer.from('zip')) {
  return {
    createUploadTarget: vi.fn(async () => ({
      bucket: 'html-packages',
      path: PATH,
      token: 'tok',
    })),
    read: vi.fn(async () => zip),
    discard: vi.fn(async () => {}),
  }
}

describe('prepareHtmlPackageUpload', () => {
  it('pide el destino de subida del contenido', async () => {
    const staging = fakeStaging()
    const prepare = makePrepareHtmlPackageUpload({ staging })

    await expect(prepare(CONTENT_ID)).resolves.toEqual({
      bucket: 'html-packages',
      path: PATH,
      token: 'tok',
    })
    expect(staging.createUploadTarget).toHaveBeenCalledWith(CONTENT_ID)
  })
})

describe('uploadStagedHtmlPackage', () => {
  const upload = vi.fn(async () => 'version-id')

  beforeEach(() => vi.clearAllMocks())

  it('lee la subida, la procesa con el caso de uso de siempre y la borra', async () => {
    const zip = Buffer.from('contenido-del-zip')
    const staging = fakeStaging(zip)
    const run = makeUploadStagedHtmlPackage({ staging, upload })

    await expect(run(CONTENT_ID, PATH)).resolves.toBe('version-id')

    expect(staging.read).toHaveBeenCalledWith(PATH)
    expect(upload).toHaveBeenCalledWith(CONTENT_ID, zip)
    expect(staging.discard).toHaveBeenCalledWith(PATH)
  })

  it('con una ruta que no es de este contenido, no lee ni borra nada', async () => {
    const staging = fakeStaging()
    const run = makeUploadStagedHtmlPackage({ staging, upload })

    await expect(
      run(CONTENT_ID, stagedPackagePath(OTHER_CONTENT_ID, UPLOAD_ID)),
    ).rejects.toBeInstanceOf(PackageValidationError)
    await expect(
      run(CONTENT_ID, `${CONTENT_ID}/v1/index.html`),
    ).rejects.toBeInstanceOf(PackageValidationError)

    expect(staging.read).not.toHaveBeenCalled()
    expect(staging.discard).not.toHaveBeenCalled()
    expect(upload).not.toHaveBeenCalled()
  })

  it('si el ZIP supera el tope, lo rechaza sin procesarlo y lo borra', async () => {
    const staging = fakeStaging(
      Buffer.alloc(PACKAGE_LIMITS.maxZipSizeBytes + 1),
    )
    const run = makeUploadStagedHtmlPackage({ staging, upload })

    await expect(run(CONTENT_ID, PATH)).rejects.toBeInstanceOf(
      PackageValidationError,
    )

    expect(upload).not.toHaveBeenCalled()
    expect(staging.discard).toHaveBeenCalledWith(PATH)
  })

  it('si el proceso falla, propaga el error y borra la subida igualmente', async () => {
    const staging = fakeStaging()
    const failing = vi.fn(async () => {
      throw new PackageValidationError(['Falta index.html en la raíz del ZIP'])
    })
    const run = makeUploadStagedHtmlPackage({ staging, upload: failing })

    await expect(run(CONTENT_ID, PATH)).rejects.toMatchObject({
      issues: ['Falta index.html en la raíz del ZIP'],
    })
    expect(staging.discard).toHaveBeenCalledWith(PATH)
  })

  it('si no se puede leer la subida, propaga el error y también intenta borrarla', async () => {
    const staging = fakeStaging()
    staging.read.mockRejectedValueOnce(new Error('no existe'))
    const run = makeUploadStagedHtmlPackage({ staging, upload })

    await expect(run(CONTENT_ID, PATH)).rejects.toThrow('no existe')
    expect(upload).not.toHaveBeenCalled()
    expect(staging.discard).toHaveBeenCalledWith(PATH)
  })
})
