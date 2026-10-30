import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { DEFAULT_OG_IMAGE } from '@/lib/pageMetadata'

/**
 * RES-C3 y RES-C4: los ficheros que el código da por existentes. Un PNG
 * guarda su ancho y alto en la cabecera (bytes 16 a 23), así que se puede
 * comprobar el tamaño sin librerías de imagen.
 */

const ROOT = path.resolve(__dirname, '../../..')

function pngSize(file: string) {
  const bytes = readFileSync(path.join(ROOT, file))
  const signature = bytes.subarray(0, 8).toString('hex')

  return {
    signature,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  }
}

describe('imágenes de marca', () => {
  it('la imagen para compartir existe en public/ y mide lo que declara el código', () => {
    const size = pngSize(`public${DEFAULT_OG_IMAGE.url}`)

    expect(size.signature).toBe('89504e470d0a1a0a')
    expect(size.width).toBe(DEFAULT_OG_IMAGE.width)
    expect(size.height).toBe(DEFAULT_OG_IMAGE.height)
  })

  it('el icono de iOS (public/apple-touch-icon.png) es un PNG de 180 × 180', () => {
    const size = pngSize('public/apple-touch-icon.png')

    expect(size.signature).toBe('89504e470d0a1a0a')
    expect(size.width).toBe(180)
    expect(size.height).toBe(180)
  })

  it('el favicon.ico es un icono válido con 16, 32 y 48 píxeles', () => {
    const ico = readFileSync(path.join(ROOT, 'src/app/favicon.ico'))
    const count = ico.readUInt16LE(4)
    const sizes = Array.from({ length: count }, (_, i) => ico[6 + i * 16])

    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48])
  })
})
