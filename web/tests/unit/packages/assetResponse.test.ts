import { describe, expect, it } from 'vitest'

import { contentTypeFor } from '@/modules/packages/infrastructure/assetResponse'

/**
 * Ampliación del 29 de septiembre: los paquetes reales de insights traen
 * tipografía WOFF2 e imágenes JPEG/WebP, que antes salían como
 * application/octet-stream (ver assetResponse.ts).
 */
describe('contentTypeFor', () => {
  it('sirve WOFF2 con su MIME correcto', () => {
    expect(contentTypeFor('coolvetica.woff2')).toBe('font/woff2')
  })

  it('sirve WOFF con su MIME correcto', () => {
    expect(contentTypeFor('coolvetica.woff')).toBe('font/woff')
  })

  it('normaliza la extensión a minúsculas (fuentes exportadas como .WOFF2)', () => {
    expect(contentTypeFor('COOLVETICA.WOFF2')).toBe('font/woff2')
  })

  it('mantiene los MIME de CSS y JavaScript', () => {
    expect(contentTypeFor('style.css')).toBe('text/css; charset=utf-8')
    expect(contentTypeFor('app.js')).toBe('text/javascript; charset=utf-8')
  })

  it('sirve imágenes conocidas con su MIME, jpg y jpeg incluidos', () => {
    expect(contentTypeFor('image.png')).toBe('image/png')
    expect(contentTypeFor('image.webp')).toBe('image/webp')
    expect(contentTypeFor('image.jpg')).toBe('image/jpeg')
    expect(contentTypeFor('image.jpeg')).toBe('image/jpeg')
  })

  it('usa octet-stream para formatos desconocidos y para un nombre sin extensión', () => {
    expect(contentTypeFor('archivo.bin')).toBe('application/octet-stream')
    expect(contentTypeFor('sin-extension')).toBe('application/octet-stream')
  })
})
