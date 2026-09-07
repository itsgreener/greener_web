import { describe, it, expect } from 'vitest'
import {
  contentTypeSchema,
  localeSchema,
  createContentSchema,
  updateContentSchema,
  deleteContentSchema,
  publishContentSchema,
  scheduleContentSchema,
  unpublishContentSchema,
} from '@/modules/content/domain/contentSchema'

describe('contentTypeSchema', () => {
  it('acepta los cinco tipos del supertipo content (§7.1)', () => {
    for (const type of ['case', 'insight', 'tool', 'episode', 'page']) {
      expect(contentTypeSchema.safeParse(type).success).toBe(true)
    }
  })

  it("rechaza 'shop' — excluido de V1 (ADR-10)", () => {
    expect(contentTypeSchema.safeParse('shop').success).toBe(false)
  })
})

describe('localeSchema', () => {
  it('acepta es/en/ca', () => {
    for (const locale of ['es', 'en', 'ca']) {
      expect(localeSchema.safeParse(locale).success).toBe(true)
    }
  })

  it('rechaza cualquier otro idioma', () => {
    expect(localeSchema.safeParse('fr').success).toBe(false)
  })
})

describe('createContentSchema', () => {
  const base = {
    type: 'case' as const,
    slug: 'mi-primer-caso',
    defaultLocale: 'es' as const,
    title: 'Mi primer caso',
  }

  it('acepta un slug en minúsculas con guiones', () => {
    expect(createContentSchema.safeParse(base).success).toBe(true)
  })

  it('acepta un slug de un solo segmento sin guiones', () => {
    const result = createContentSchema.safeParse({ ...base, slug: 'caso' })
    expect(result.success).toBe(true)
  })

  it.each([
    'Mi-Caso', // mayúsculas
    'mi_caso', // guion bajo
    'mi caso', // espacio
    '-mi-caso', // guion inicial
    'mi-caso-', // guion final
    'mi--caso', // doble guion
    '',
  ])('rechaza el slug inválido %j', (slug) => {
    expect(createContentSchema.safeParse({ ...base, slug }).success).toBe(false)
  })

  it('recorta espacios en slug y título antes de validar', () => {
    const result = createContentSchema.safeParse({
      ...base,
      slug: '  mi-primer-caso  ',
      title: '  Mi primer caso  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.slug).toBe('mi-primer-caso')
      expect(result.data.title).toBe('Mi primer caso')
    }
  })

  it('rechaza un título vacío o solo espacios', () => {
    expect(
      createContentSchema.safeParse({ ...base, title: '   ' }).success,
    ).toBe(false)
  })

  it('rechaza un tipo de contenido no soportado', () => {
    expect(
      createContentSchema.safeParse({ ...base, type: 'shop' }).success,
    ).toBe(false)
  })
})

describe('updateContentSchema', () => {
  it("ya NO acepta 'type' — el tipo queda bloqueado tras crear el contenido (migración 20260827091314)", () => {
    const withType = {
      id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f',
      type: 'case',
      slug: 'mi-caso',
      defaultLocale: 'es',
    }

    const result = updateContentSchema.safeParse(withType)

    expect(result.success).toBe(true)
    if (result.success) {
      // El campo 'type', si se envía, se ignora silenciosamente: no forma
      // parte del schema. Confirma que no hay forma de colarlo desde el
      // formulario del ABM.
      expect(result.data).not.toHaveProperty('type')
    }
  })

  it('rechaza un id que no sea un uuid válido', () => {
    const result = updateContentSchema.safeParse({
      id: 'no-es-un-uuid',
      slug: 'mi-caso',
      defaultLocale: 'es',
    })

    expect(result.success).toBe(false)
  })

  it('rechaza el mismo slug inválido que createContentSchema', () => {
    const result = updateContentSchema.safeParse({
      id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f',
      slug: 'Slug Con Espacios',
      defaultLocale: 'es',
    })

    expect(result.success).toBe(false)
  })
})

describe('deleteContentSchema', () => {
  it('acepta un uuid válido', () => {
    const result = deleteContentSchema.safeParse({
      id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f',
    })

    expect(result.success).toBe(true)
  })

  it('rechaza un id vacío', () => {
    expect(deleteContentSchema.safeParse({ id: '' }).success).toBe(false)
  })
})

describe('publishContentSchema / unpublishContentSchema', () => {
  it('ambos aceptan solo un id uuid — publicar/despublicar no llevan más datos', () => {
    const input = { id: '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f' }

    expect(publishContentSchema.safeParse(input).success).toBe(true)
    expect(unpublishContentSchema.safeParse(input).success).toBe(true)
  })

  it('ambos rechazan un id inválido', () => {
    const input = { id: 'no-es-uuid' }

    expect(publishContentSchema.safeParse(input).success).toBe(false)
    expect(unpublishContentSchema.safeParse(input).success).toBe(false)
  })
})

describe('scheduleContentSchema', () => {
  const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

  it('acepta una fecha futura', () => {
    const future = new Date(Date.now() + 60_000).toISOString()

    const result = scheduleContentSchema.safeParse({
      id: CONTENT_ID,
      publishAt: future,
    })

    expect(result.success).toBe(true)
  })

  it('rechaza una fecha pasada — coincide con schedule_content (SQL)', () => {
    const past = new Date(Date.now() - 60_000).toISOString()

    const result = scheduleContentSchema.safeParse({
      id: CONTENT_ID,
      publishAt: past,
    })

    expect(result.success).toBe(false)
  })

  it('rechaza exactamente "ahora mismo" — debe ser estrictamente futura', () => {
    const now = new Date().toISOString()

    const result = scheduleContentSchema.safeParse({
      id: CONTENT_ID,
      publishAt: now,
    })

    expect(result.success).toBe(false)
  })

  it('acepta una cadena ISO con Z explícito — el formato que produce localDateTimeToIsoUtc() en el navegador antes de enviar el formulario', () => {
    const future = new Date(Date.now() + 3_600_000).toISOString()

    const result = scheduleContentSchema.safeParse({
      id: CONTENT_ID,
      publishAt: future,
    })

    expect(result.success).toBe(true)
  })

  it('un datetime-local SIN zona horaria es ambiguo y no debe usarse directamente aquí — la conversión a UTC vive en el navegador (datetimeLocal.ts), no en este schema, precisamente porque z.coerce.date() interpretaría la cadena con la zona horaria del proceso Node del servidor, no la del admin', () => {
    // Este test documenta la razón de ser de localDateTimeToIsoUtc(), no
    // afirma nada sobre "aceptar o rechazar": con Z explícito (arriba) el
    // resultado es determinista en cualquier zona horaria; sin él, no lo es
    // — y ese fue exactamente el bug (§6, entrada del 7 de septiembre).
    const rawLocalValue = '2026-09-07T13:39'

    const result = scheduleContentSchema.safeParse({
      id: CONTENT_ID,
      publishAt: rawLocalValue,
    })

    // El resultado (éxito o fracaso) depende de la zona horaria del proceso
    // que ejecuta el test, así que no se afirma cuál es — solo que no
    // revienta y que, si tiene éxito, coincide con new Date() en este mismo
    // proceso (mismo criterio ambiguo, consistente consigo mismo).
    if (result.success) {
      expect(result.data.publishAt.getTime()).toBe(
        new Date(rawLocalValue).getTime(),
      )
    } else {
      expect(result.success).toBe(false)
    }
  })

  it('rechaza una fecha que no se puede parsear', () => {
    const result = scheduleContentSchema.safeParse({
      id: CONTENT_ID,
      publishAt: 'no-es-una-fecha',
    })

    expect(result.success).toBe(false)
  })
})
