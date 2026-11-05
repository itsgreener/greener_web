import { describe, it, expect } from 'vitest'
import {
  EPISODE_KIND_LABEL,
  EPISODE_PROGRAM_LABEL,
  episodeKindLabel,
  episodePinSecondaryText,
  episodeProgramLabel,
} from '@/modules/content/domain/episodeLabels'
import {
  episodeKindSchema,
  episodeProgramSchema,
} from '@/modules/content/domain/episodeSchema'

describe('etiquetas de episodio', () => {
  it('hay etiqueta para TODOS los programas y tipos del esquema (si se añade uno, hay que etiquetarlo)', () => {
    for (const program of episodeProgramSchema.options) {
      expect(EPISODE_PROGRAM_LABEL[program], program).toBeTruthy()
    }
    for (const kind of episodeKindSchema.options) {
      expect(EPISODE_KIND_LABEL[kind], kind).toBeTruthy()
    }
  })

  it('los nombres coinciden con los del desplegable «Programa» del ABM', () => {
    expect(episodeProgramLabel('brand_the_future')).toBe('Brand the Future')
    expect(episodeProgramLabel('brand_into_europe')).toBe('Brand into Europe')
    expect(episodeProgramLabel('brand_to_table')).toBe('Brand to Table')
    expect(episodeKindLabel('podcast')).toBe('Podcast')
  })

  it('un valor desconocido se muestra tal cual en vez de romper; vacío → cadena vacía', () => {
    expect(episodeProgramLabel('otro_programa')).toBe('otro_programa')
    expect(episodeKindLabel('webinar')).toBe('webinar')
    expect(episodeProgramLabel(null)).toBe('')
    expect(episodeKindLabel(undefined)).toBe('')
  })
})

describe('episodePinSecondaryText — segunda línea del pin de episodio', () => {
  it('programa + tipo: «Brand the Future Podcast»', () => {
    expect(episodePinSecondaryText('brand_the_future', 'podcast')).toBe(
      'Brand the Future Podcast',
    )
    expect(episodePinSecondaryText('brand_into_europe', 'podcast')).toBe(
      'Brand into Europe Podcast',
    )
  })

  it('si falta uno de los dos sale solo el otro; si faltan ambos, no hay línea', () => {
    expect(episodePinSecondaryText(null, 'podcast')).toBe('Podcast')
    expect(episodePinSecondaryText('brand_to_table', null)).toBe(
      'Brand to Table',
    )
    expect(episodePinSecondaryText(null, null)).toBeNull()
    expect(episodePinSecondaryText('', undefined)).toBeNull()
  })
})
