import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 15 oct 2026 (plan de other, fase 1): `other` ya no tiene portada. Este test
 * fija que no queda nada de la maquinaria: columnas, RPC, casos de uso,
 * acciones del ABM, tipos de uso del calentamiento ni mensajes de error.
 * Las migraciones antiguas (que la crearon) no cuentan: son historia.
 */

const root = resolve(__dirname, '../../..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name === '.next') return []
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const sources = [...walk(join(root, 'src')), ...walk(join(root, 'scripts'))]
  .filter((path) => /\.(ts|tsx|mjs|css)$/.test(path))

const REMNANTS = [
  /cover_media_id/,
  /cover_ratio/,
  /register_cover_(image|video)/,
  /unlink_and_delete_cover_media/,
  /registerCover(Image|Video)/,
  /deleteCoverMedia/,
  /otherCover/,
  /CoverMediaUpload/,
  /cover_unsupported/,
  /cover_video_unsupported/,
  /coverMediaOverride|coverRatioOverride|coverAltOverride/,
]

describe('no queda código de la portada de other', () => {
  it('hay código que revisar', () => {
    expect(sources.length).toBeGreaterThan(100)
  })

  it.each(REMNANTS.map((pattern) => [String(pattern), pattern] as const))(
    'ningún fichero de src ni de scripts contiene %s',
    (_label, pattern) => {
      const offenders = sources.filter((path) =>
        pattern.test(readFileSync(path, 'utf8')),
      )

      expect(offenders.map((path) => path.replace(root, ''))).toEqual([])
    },
  )

  it('los ficheros de la portada están borrados', () => {
    for (const path of [
      'src/modules/media/application/registerCoverImage.ts',
      'src/modules/media/application/registerCoverVideo.ts',
      'src/modules/media/application/deleteCoverMedia.ts',
      'src/app/admin/(panel)/contents/[id]/edit/mediaActions.ts',
      'src/app/admin/(panel)/contents/[id]/edit/CoverMediaUpload',
    ]) {
      expect(existsSync(join(root, path)), path).toBe(false)
    }
  })

  it('el contenido público y el del admin ya no llevan portada', () => {
    const publicContent = readFileSync(
      join(root, 'src/modules/content/domain/publicContent.ts'),
      'utf8',
    )

    expect(publicContent).not.toMatch(/coverMedia|coverRatio/)
  })
})
