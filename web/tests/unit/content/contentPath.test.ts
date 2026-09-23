import { describe, it, expect } from 'vitest'
import { publicContentPath } from '@/modules/content/domain/contentPath'

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

  it('insight va a /insights/[slug]', () => {
    expect(publicContentPath('insight', 'mi-insight')).toBe(
      '/insights/mi-insight',
    )
  })

  it('other va a /variety/[slug]', () => {
    expect(publicContentPath('other', 'mi-cosa')).toBe('/variety/mi-cosa')
  })
})
