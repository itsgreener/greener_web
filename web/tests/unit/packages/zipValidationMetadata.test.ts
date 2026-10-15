import AdmZip from 'adm-zip'
import { describe, expect, it } from 'vitest'

import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import { validateHtmlPackageZip } from '@/modules/packages/infrastructure/zipValidation'
import {
  OG_IMAGE_PATH,
  VALID_METADATA,
  jpegBytes,
  pngBytes,
  webpBytes,
} from '@tests/helpers/packageFixtures'

/**
 * Cada test fija una afirmación de `contrato-zip-tools-insights.md` §2.1
 * (bloque `metadata` y su imagen Open Graph) contra el validador REAL.
 */

const OMIT = Symbol('sin metadata')

function manifest(metadata: unknown) {
  return {
    kind: 'insight',
    entrypoint: 'index.html',
    version: 1,
    requiredCapabilities: [],
    externalDomains: [],
    minViewport: { width: 320, height: 420 },
    ...(metadata === OMIT ? {} : { metadata }),
  }
}

function buildZip(options: {
  metadata?: unknown
  image?: { path: string; data: Buffer } | null
}): Buffer {
  const zip = new AdmZip()

  zip.addFile('index.html', Buffer.from('<h1>Hola</h1>'))
  zip.addFile(
    'manifest.json',
    Buffer.from(
      JSON.stringify(
        manifest('metadata' in options ? options.metadata : VALID_METADATA),
      ),
    ),
  )

  const image =
    options.image === undefined
      ? { path: OG_IMAGE_PATH, data: pngBytes() }
      : options.image

  if (image) zip.addFile(image.path, image.data)

  return zip.toBuffer()
}

function issuesOf(buffer: Buffer): string {
  try {
    validateHtmlPackageZip(buffer)
    return ''
  } catch (error) {
    if (error instanceof PackageValidationError) return error.issues.join(' | ')
    throw error
  }
}

function withMetadata(patch: Record<string, unknown>) {
  return { ...VALID_METADATA, ...patch }
}

describe('contrato §2.1 — el bloque metadata es obligatorio', () => {
  it('un manifest sin metadata se rechaza', () => {
    expect(issuesOf(buildZip({ metadata: OMIT }))).toMatch(
      /manifest\.json: metadata/,
    )
  })

  it.each(['title', 'description', 'language', 'ogImage'] as const)(
    'falta metadata.%s',
    (field) => {
      const metadata: Record<string, unknown> = { ...VALID_METADATA }
      delete metadata[field]

      expect(issuesOf(buildZip({ metadata }))).toContain(`metadata.${field}`)
    },
  )

  it('acepta metadata completa, con color de tema y keywords', () => {
    const buffer = buildZip({
      metadata: withMetadata({
        themeColor: '#1941f5',
        keywords: ['color', 'paleta'],
      }),
    })

    expect(issuesOf(buffer)).toBe('')
  })

  it('el título admite como máximo 70 caracteres y la descripción 200', () => {
    const { titleMax, descriptionMax } = PACKAGE_LIMITS.metadata

    expect(titleMax).toBe(70)
    expect(descriptionMax).toBe(200)
    expect(
      issuesOf(buildZip({ metadata: withMetadata({ title: 'a'.repeat(70) }) })),
    ).toBe('')
    expect(
      issuesOf(buildZip({ metadata: withMetadata({ title: 'a'.repeat(71) }) })),
    ).toContain('metadata.title')
    expect(
      issuesOf(
        buildZip({ metadata: withMetadata({ description: 'a'.repeat(201) }) }),
      ),
    ).toContain('metadata.description')
  })

  it.each(['espanol', 'ES', 'es_ES', 'spa'])(
    'rechaza el idioma "%s" (se usa "es", "en", "es-ES"…)',
    (language) => {
      expect(
        issuesOf(buildZip({ metadata: withMetadata({ language }) })),
      ).toContain('metadata.language')
    },
  )

  it('rechaza un color de tema que no sea #rrggbb', () => {
    expect(
      issuesOf(buildZip({ metadata: withMetadata({ themeColor: 'azul' }) })),
    ).toContain('metadata.themeColor')
  })
})

describe('contrato §2.1 — la imagen Open Graph', () => {
  const og = (path: string, alt = 'Texto alternativo') => ({
    metadata: withMetadata({ ogImage: { path, alt } }),
  })

  it('debe existir dentro del ZIP', () => {
    expect(issuesOf(buildZip({ image: null }))).toMatch(/no existe en el ZIP/)
  })

  it.each([
    'og.png',
    '/assets/og.png',
    'assets/../og.png',
    'assets/og.gif',
    'assets/og.svg',
    'assets/mi imagen.png',
  ])(
    'rechaza la ruta "%s" (bajo assets/, sin espacios, png/jpg/webp)',
    (path) => {
      expect(issuesOf(buildZip({ ...og(path), image: null }))).toContain(
        'metadata.ogImage.path',
      )
    },
  )

  it('exige texto alternativo', () => {
    expect(issuesOf(buildZip(og(OG_IMAGE_PATH, '   ')))).toContain(
      'metadata.ogImage.alt',
    )
  })

  it('acepta PNG, JPG, JPEG y WebP (lossy, lossless y extendido)', () => {
    const cases: Array<[string, Buffer]> = [
      ['assets/og.png', pngBytes()],
      ['assets/og.jpg', jpegBytes()],
      ['assets/og.jpeg', jpegBytes()],
      ['assets/img/og.webp', webpBytes('lossy')],
      ['assets/og2.webp', webpBytes('lossless')],
      ['assets/og3.webp', webpBytes('extended')],
    ]

    for (const [path, data] of cases) {
      expect(issuesOf(buildZip({ ...og(path), image: { path, data } }))).toBe(
        '',
      )
    }
  })

  it('rechaza un fichero cuyo contenido no es del formato que dice su extensión', () => {
    expect(
      issuesOf(
        buildZip({
          ...og('assets/og.png'),
          image: { path: 'assets/og.png', data: jpegBytes() },
        }),
      ),
    ).toMatch(/no es una imagen PNG válida/)

    expect(
      issuesOf(
        buildZip({
          ...og('assets/og.png'),
          image: { path: 'assets/og.png', data: Buffer.from('<svg/>') },
        }),
      ),
    ).toMatch(/no es una imagen PNG válida/)
  })

  it('rechaza una imagen menor de 1200 × 630', () => {
    expect(
      issuesOf(
        buildZip({ image: { path: OG_IMAGE_PATH, data: pngBytes(600, 315) } }),
      ),
    ).toMatch(/mide 600 × 315 px; el mínimo es 1200 × 630/)
  })

  it('rechaza una imagen cuya proporción se aleja de 1,91:1 (cuadrada, vertical, panorámica)', () => {
    for (const [w, h] of [
      [1200, 1200],
      [1200, 1800],
      [2400, 630],
    ]) {
      expect(
        issuesOf(
          buildZip({ image: { path: OG_IMAGE_PATH, data: pngBytes(w, h) } }),
        ),
      ).toMatch(/proporción/)
    }
  })

  it('admite imágenes mayores con la proporción correcta (2400 × 1260) y hasta un 5 % de margen (1250 × 630)', () => {
    for (const [w, h] of [
      [2400, 1260],
      [1260, 660],
      [1250, 630],
    ]) {
      expect(
        issuesOf(
          buildZip({ image: { path: OG_IMAGE_PATH, data: pngBytes(w, h) } }),
        ),
      ).toBe('')
    }
  })

  it('rechaza una imagen que pesa más de 5 MB', () => {
    const big = Buffer.concat([
      pngBytes(),
      Buffer.alloc(PACKAGE_LIMITS.ogImage.maxBytes),
    ])

    expect(
      issuesOf(buildZip({ image: { path: OG_IMAGE_PATH, data: big } })),
    ).toMatch(/pesa .* MB; el máximo es 5 MB/)
  })

  it('el servidor escribe las medidas REALES en el manifest, ignorando las que declare el autor', () => {
    const result = validateHtmlPackageZip(
      buildZip({
        metadata: withMetadata({
          ogImage: {
            path: OG_IMAGE_PATH,
            alt: 'x',
            width: 99,
            height: 99,
          },
        }),
        image: { path: OG_IMAGE_PATH, data: pngBytes(1400, 735) },
      }),
    )

    expect(result.manifest.metadata.ogImage).toEqual({
      path: OG_IMAGE_PATH,
      alt: 'x',
      width: 1400,
      height: 735,
    })
  })

  it('la imagen OG no cuenta como «fuera de assets/»: vive en assets/ como el resto', () => {
    expect(issuesOf(buildZip({}))).toBe('')
  })
})
