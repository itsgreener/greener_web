import { describe, it, expect } from 'vitest'
import {
  feedPinDestination,
  publicContentPath,
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

  it('insight va a /insights/[slug]', () => {
    expect(publicContentPath('insight', 'mi-insight')).toBe(
      '/insights/mi-insight',
    )
  })

  it('other va a /variety/[slug]', () => {
    expect(publicContentPath('other', 'mi-cosa')).toBe('/variety/mi-cosa')
  })
})

describe('feedPinDestination — destino de un pin del feed', () => {
  it('insight salta el detalle y abre /insights/[slug]/app', () => {
    expect(feedPinDestination('insight', 'mi-insight')).toBe(
      '/insights/mi-insight/app',
    )
  })

  it('el resto de tipos coincide con publicContentPath (tool sigue en su detalle)', () => {
    expect(feedPinDestination('tool', 'mi-tool')).toBe('/tools/mi-tool')
    expect(feedPinDestination('case', 'mi-caso')).toBe('/work/mi-caso')
    expect(feedPinDestination('episode', 'mi-ep')).toBe('/work/mi-ep')
    expect(feedPinDestination('other', 'mi-cosa')).toBe('/variety/mi-cosa')
  })

  it('la ruta pública del insight (sitemap, preview, compartir) no cambia', () => {
    expect(publicContentPath('insight', 'mi-insight')).toBe(
      '/insights/mi-insight',
    )
  })
})
