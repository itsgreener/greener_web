import { describe, expect, it } from 'vitest'
import AdmZip from 'adm-zip'

import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import { validateHtmlPackageZip } from '@/modules/packages/infrastructure/zipValidation'
import {
  OG_IMAGE_PATH,
  VALID_METADATA,
  pngBytes,
} from '@tests/helpers/packageFixtures'

/**
 * SEC-PUB-B1 (decidido el 27 oct 2026): un paquete solo puede llevar
 * `index.html` (o el entrypoint que declare el manifest) como documento HTML.
 */

const MANIFEST = {
  kind: 'tool',
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: ['canvas'],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
  metadata: VALID_METADATA,
}

function buildZip(files: Record<string, string>, manifest = MANIFEST): Buffer {
  const zip = new AdmZip()

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))

  for (const [path, content] of Object.entries(files)) {
    zip.addFile(path, Buffer.from(content))
  }

  if (!(OG_IMAGE_PATH in files)) {
    zip.addFile(OG_IMAGE_PATH, pngBytes())
  }

  return zip.toBuffer()
}

function issuesOf(buffer: Buffer): string[] {
  try {
    validateHtmlPackageZip(buffer)
  } catch (error) {
    if (error instanceof PackageValidationError) return error.issues
    throw error
  }

  return []
}

describe('documentos HTML adicionales en el ZIP', () => {
  it('acepta un paquete con solo index.html', () => {
    expect(issuesOf(buildZip({ 'index.html': '<h1>Hola</h1>' }))).toEqual([])
  })

  it.each(['assets/otra.html', 'assets/sub/otra.htm', 'assets/MAYUS.HTML'])(
    'rechaza %s',
    (path) => {
      const issues = issuesOf(
        buildZip({ 'index.html': '<h1>Hola</h1>', [path]: '<h1>x</h1>' }),
      )

      expect(issues).toHaveLength(1)
      expect(issues[0]).toContain(path)
      expect(issues[0]).toContain('documento HTML adicional')
    },
  )

  it('avisa de todos los que sobran, no solo del primero', () => {
    const issues = issuesOf(
      buildZip({
        'index.html': '<h1>Hola</h1>',
        'assets/a.html': 'a',
        'assets/b.htm': 'b',
      }),
    )

    expect(issues).toHaveLength(2)
  })

  it('sigue aceptando SVG, JS, CSS y JSON en assets/', () => {
    expect(
      issuesOf(
        buildZip({
          'index.html': '<h1>Hola</h1>',
          'assets/icono.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
          'assets/main.js': 'console.log(1)',
          'assets/style.css': 'body{}',
          'assets/datos.json': '{}',
        }),
      ),
    ).toEqual([])
  })

  it('admite el entrypoint declarado aunque no sea index.html', () => {
    const issues = issuesOf(
      buildZip(
        { 'index.html': '<h1>Hola</h1>', 'assets/app.html': '<h1>app</h1>' },
        { ...MANIFEST, entrypoint: 'assets/app.html' },
      ),
    )

    expect(issues).toEqual([])
  })
})
