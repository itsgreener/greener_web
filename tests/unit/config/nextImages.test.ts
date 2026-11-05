import { describe, expect, it } from 'vitest'

import nextConfig from '@root/next.config'

/**
 * RES-A1: la web no usa `next/image` (las imágenes llegan ya transformadas
 * desde la CDN de medios), así que el optimizador `/_next/image` tiene que
 * seguir apagado y sin dominios remotos permitidos. Si algún día se decide
 * usarlo, este test obliga a tomar la decisión a propósito (y a revisar el
 * consumo de CPU, red y cuota de optimización del hosting).
 */
describe('next.config — optimizador de imágenes', () => {
  it('está desactivado', () => {
    expect(nextConfig.images?.unoptimized).toBe(true)
  })

  it('no permite ningún dominio remoto ni patrón local', () => {
    expect(nextConfig.images?.remotePatterns ?? []).toEqual([])
    expect(nextConfig.images?.domains ?? []).toEqual([])
    expect(nextConfig.images?.localPatterns ?? []).toEqual([])
  })
})
