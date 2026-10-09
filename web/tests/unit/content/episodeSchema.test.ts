import { describe, it, expect } from 'vitest'
import { episodeSchema } from '@/modules/content/domain/episodeSchema'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const base = {
  contentId: CONTENT_ID,
  program: 'brand_the_future' as const,
  number: 1,
  guest: null,
  role: null,
  company: null,
  episodeDate: null,
  durationSeconds: null,
  provider: 'youtube' as const,
  embedId: 'abc123',
  language: 'es' as const,
  episodeKind: 'podcast' as const,
}

describe('episodeSchema — campos obligatorios (arquitectura §7.3)', () => {
  it('acepta un episodio válido mínimo', () => {
    expect(episodeSchema.safeParse(base).success).toBe(true)
  })

  it.each(['brand_the_future', 'brand_into_europe', 'brand_to_table'])(
    'acepta cada programa de la lista cerrada: %s',
    (program) => {
      expect(episodeSchema.safeParse({ ...base, program }).success).toBe(true)
    },
  )

  it('rechaza un programa fuera de la lista cerrada', () => {
    expect(
      episodeSchema.safeParse({ ...base, program: 'otro_programa' }).success,
    ).toBe(false)
  })

  it.each(['youtube', 'vimeo', 'spotify'])(
    'acepta cada proveedor real: %s',
    (provider) => {
      expect(episodeSchema.safeParse({ ...base, provider }).success).toBe(true)
    },
  )

  it('rechaza un proveedor que no sea youtube/vimeo/spotify', () => {
    expect(
      episodeSchema.safeParse({ ...base, provider: 'dailymotion' }).success,
    ).toBe(false)
  })

  it('embedId es obligatorio — rechaza vacío', () => {
    expect(episodeSchema.safeParse({ ...base, embedId: '' }).success).toBe(
      false,
    )
    expect(episodeSchema.safeParse({ ...base, embedId: '   ' }).success).toBe(
      false,
    )
  })

  it.each(['es', 'en', 'ca'])('acepta cada idioma real: %s', (language) => {
    expect(episodeSchema.safeParse({ ...base, language }).success).toBe(true)
  })

  it('episodeKind solo acepta "podcast" por ahora (enum ampliable, arranca con un único valor)', () => {
    expect(
      episodeSchema.safeParse({ ...base, episodeKind: 'podcast' }).success,
    ).toBe(true)
    expect(
      episodeSchema.safeParse({ ...base, episodeKind: 'video' }).success,
    ).toBe(false)
  })
})

describe('episodeSchema — campos opcionales', () => {
  it('acepta number/guest/role/company/episodeDate/durationSeconds como null', () => {
    expect(episodeSchema.safeParse(base).success).toBe(true)
  })

  it('acepta number/durationSeconds positivos y rechaza 0 o negativos', () => {
    expect(episodeSchema.safeParse({ ...base, number: 3 }).success).toBe(true)
    expect(episodeSchema.safeParse({ ...base, number: 0 }).success).toBe(false)
    expect(episodeSchema.safeParse({ ...base, number: -1 }).success).toBe(false)
    expect(
      episodeSchema.safeParse({ ...base, durationSeconds: 1800 }).success,
    ).toBe(true)
    expect(
      episodeSchema.safeParse({ ...base, durationSeconds: 0 }).success,
    ).toBe(false)
  })

  it('acepta guest/role/company como texto libre', () => {
    const result = episodeSchema.safeParse({
      ...base,
      guest: 'Ana García',
      role: 'CMO',
      company: 'Agróptimum',
    })
    expect(result.success).toBe(true)
  })

  it('episodeDate acepta una fecha ISO válida y rechaza una no válida', () => {
    expect(
      episodeSchema.safeParse({ ...base, episodeDate: '2026-03-14' }).success,
    ).toBe(true)
    expect(
      episodeSchema.safeParse({ ...base, episodeDate: 'no-es-una-fecha' })
        .success,
    ).toBe(false)
  })
})

describe('episodeSchema — identificador de contenido', () => {
  it('rechaza un contentId que no sea un uuid válido', () => {
    expect(
      episodeSchema.safeParse({ ...base, contentId: 'no-es-un-uuid' }).success,
    ).toBe(false)
  })
})
