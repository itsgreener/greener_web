import { describe, it, expect } from 'vitest'
import {
  publicContentPath,
  workLocalePath,
} from '@/modules/content/domain/contentPath'

describe('publicContentPath — ruta pública por tipo (especificacion-final-formato-detalle.md §7)', () => {
  it('case y episode comparten /work/[slug]', () => {
    expect(publicContentPath('case', 'mi-caso')).toBe('/work/mi-caso')
    expect(publicContentPath('episode', 'mi-episodio')).toBe(
      '/work/mi-episodio',
    )
  })

  it('tool va a /tools/[slug]', () => {
    expect(publicContentPath('tool', 'mi-tool')).toBe('/tools/mi-tool')
  })

  it('insight va directo a su paquete, /insights/[slug]/app (sin ficha)', () => {
    expect(publicContentPath('insight', 'mi-insight')).toBe(
      '/insights/mi-insight/app',
    )
  })

  it('other va directo a su página satélite, /variety/[slug]/app (sin ficha)', () => {
    expect(publicContentPath('other', 'mi-cosa')).toBe('/variety/mi-cosa/app')
  })
})

describe('workLocalePath — ruta de un caso por idioma (arquitectura §7.7)', () => {
  it('el idioma por defecto usa la ruta canónica, sin segmento de idioma', () => {
    expect(workLocalePath('mi-caso', 'es', 'es')).toBe('/work/mi-caso')
    expect(workLocalePath('mi-caso', 'en', 'en')).toBe('/work/mi-caso')
  })

  it('los demás idiomas llevan su segmento', () => {
    expect(workLocalePath('mi-caso', 'en', 'es')).toBe('/work/mi-caso/en')
    expect(workLocalePath('mi-caso', 'ca', 'es')).toBe('/work/mi-caso/ca')
  })

  it('la canónica coincide con la de publicContentPath', () => {
    expect(workLocalePath('mi-caso', 'es', 'es')).toBe(
      publicContentPath('case', 'mi-caso'),
    )
  })
})
