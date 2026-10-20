import { readdirSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  isReservedRootSegment,
  RESERVED_ROOT_SEGMENTS,
} from '@/modules/content/domain/reservedSlugs'

/**
 * La URL corta de una página satélite (`/{slug}`) la gana cualquier ruta
 * estática. Este test mira las carpetas reales de la web: una ruta o un
 * fichero público nuevo que no esté en la lista de slugs reservados lo rompe.
 */

const ROOT = path.resolve(__dirname, '../../..')

function entries(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true }).map(
    (entry) => entry.name,
  )
}

/** Nombre de URL de una entrada de `src/app`, o null si no es una ruta. */
function routeSegment(name: string): string | null {
  // Grupos `(x)` no aportan segmento; `_x` son privadas; `[x]` son dinámicas.
  if (name.startsWith('(') || name.startsWith('_') || name.startsWith('[')) {
    return null
  }

  // Ficheros de la convención de Next.js que no son rutas.
  if (
    /^(layout|page|error|global-error|not-found|loading|template)\./.test(name)
  ) {
    return null
  }

  // Rutas de metadatos: robots.ts → /robots.txt, sitemap.ts → /sitemap.xml.
  if (name === 'robots.ts') return 'robots.txt'
  if (name === 'sitemap.ts') return 'sitemap.xml'

  if (name === 'globals.css') return null

  return name
}

describe('segmentos reservados de la URL corta', () => {
  it('incluyen cada ruta de primer nivel de src/app', () => {
    const groups = [
      'src/app',
      'src/app/(public)',
      'src/app/(public)/(feed)',
      'src/app/(public)/(detail)',
    ]

    const segments = groups
      .flatMap((dir) => entries(dir))
      .map(routeSegment)
      .filter((segment): segment is string => segment !== null)

    // Sanidad: el test no puede pasar en vacío.
    expect(segments).toContain('contact')
    expect(segments).toContain('variety')

    for (const segment of segments) {
      expect(RESERVED_ROOT_SEGMENTS, `falta «${segment}»`).toContain(segment)
    }
  })

  it('incluyen cada fichero y carpeta de public', () => {
    const publicEntries = entries('public')

    expect(publicEntries.length).toBeGreaterThan(0)

    for (const name of publicEntries) {
      expect(RESERVED_ROOT_SEGMENTS, `falta «${name}»`).toContain(name)
    }
  })

  it('no lleva nada que ya no exista (la lista no se infla sola)', () => {
    const existing = new Set([
      ...[
        'src/app',
        'src/app/(public)',
        'src/app/(public)/(feed)',
        'src/app/(public)/(detail)',
      ]
        .flatMap((dir) => entries(dir))
        .map(routeSegment)
        .filter((segment): segment is string => segment !== null),
      ...entries('public'),
      // No son carpetas del repositorio: los sirve Next.js o el proxy.
      'favicon.ico',
      '_next',
      'internal',
    ])

    for (const segment of RESERVED_ROOT_SEGMENTS) {
      expect(existing, `sobra «${segment}»`).toContain(segment)
    }
  })

  it('isReservedRootSegment no distingue mayúsculas', () => {
    expect(isReservedRootSegment('contact')).toBe(true)
    expect(isReservedRootSegment('Contact')).toBe(true)
    expect(isReservedRootSegment('talent')).toBe(false)
  })
})
