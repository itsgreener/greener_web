import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * La capa application/ de `content` (createContent.ts, updateContent.ts, etc.)
 * es deliberadamente fina: valida con zod (`.parse`, que lanza en vez de
 * devolver un resultado) y delega en el repositorio concreto — a diferencia
 * de `modules/feed/application/`, aquí NO se inyecta el repositorio como
 * parámetro, sino que se importa el singleton `supabaseXxxRepository`
 * directamente (ver PROGRESO.md / informe de auditoría). Eso hace que la
 * única forma de testear esta capa sin levantar Supabase sea mockear el
 * módulo de infraestructura con vi.mock — lo que este fichero hace, uno
 * por cada función de application/.
 *
 * Lo que se prueba en cada caso es el contrato real: con datos válidos, se
 * llama al repositorio con los datos ya parseados/normalizados por zod; con
 * datos inválidos, el repositorio NUNCA se llega a tocar.
 */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const BLOCK_ID = '7a1f2e3d-4c5b-6a7d-8e9f-0a1b2c3d4e5f'

vi.mock('@/modules/content/infrastructure/supabaseContentRepository', () => ({
  supabaseContentRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    createDraft: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock(
  '@/modules/content/infrastructure/supabaseContentBlockRepository',
  () => ({
    supabaseContentBlockRepository: {
      listByContentId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsertTranslation: vi.fn(),
    },
  }),
)

vi.mock(
  '@/modules/content/infrastructure/supabaseCaseDetailRepository',
  () => ({
    supabaseCaseDetailRepository: {
      getByContentId: vi.fn(),
      upsert: vi.fn(),
    },
  }),
)

vi.mock(
  '@/modules/content/infrastructure/supabaseContentTranslationRepository',
  () => ({
    supabaseContentTranslationRepository: {
      listByContentId: vi.fn(),
      upsert: vi.fn(),
    },
  }),
)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createContent', () => {
  it('valida con zod y delega en supabaseContentRepository.createDraft con los datos recortados', async () => {
    const { createContent } =
      await import('@/modules/content/application/createContent')
    const { supabaseContentRepository } =
      await import('@/modules/content/infrastructure/supabaseContentRepository')

    vi.mocked(supabaseContentRepository.createDraft).mockResolvedValue(
      CONTENT_ID,
    )

    const result = await createContent({
      type: 'case',
      slug: '  mi-caso  ',
      defaultLocale: 'es',
      title: '  Mi caso  ',
    })

    expect(result).toBe(CONTENT_ID)
    expect(supabaseContentRepository.createDraft).toHaveBeenCalledWith({
      type: 'case',
      slug: 'mi-caso',
      defaultLocale: 'es',
      title: 'Mi caso',
    })
  })

  it('rechaza un slug inválido sin llegar a llamar al repositorio', async () => {
    const { createContent } =
      await import('@/modules/content/application/createContent')
    const { supabaseContentRepository } =
      await import('@/modules/content/infrastructure/supabaseContentRepository')

    await expect(
      createContent({
        type: 'case',
        slug: 'Slug Inválido',
        defaultLocale: 'es',
        title: 'Mi caso',
      }),
    ).rejects.toThrow()

    expect(supabaseContentRepository.createDraft).not.toHaveBeenCalled()
  })
})

describe('updateContent', () => {
  it('delega en supabaseContentRepository.update sin permitir cambiar el tipo', async () => {
    const { updateContent } =
      await import('@/modules/content/application/updateContent')
    const { supabaseContentRepository } =
      await import('@/modules/content/infrastructure/supabaseContentRepository')

    vi.mocked(supabaseContentRepository.update).mockResolvedValue(CONTENT_ID)

    await updateContent({
      id: CONTENT_ID,
      slug: 'nuevo-slug',
      defaultLocale: 'en',
    })

    expect(supabaseContentRepository.update).toHaveBeenCalledWith({
      id: CONTENT_ID,
      slug: 'nuevo-slug',
      defaultLocale: 'en',
    })
  })

  it('rechaza un id que no sea uuid sin llamar al repositorio', async () => {
    const { updateContent } =
      await import('@/modules/content/application/updateContent')
    const { supabaseContentRepository } =
      await import('@/modules/content/infrastructure/supabaseContentRepository')

    await expect(
      updateContent({ id: 'no-es-uuid', slug: 'slug', defaultLocale: 'es' }),
    ).rejects.toThrow()

    expect(supabaseContentRepository.update).not.toHaveBeenCalled()
  })
})

describe('deleteContent', () => {
  it('delega en supabaseContentRepository.delete con un id válido', async () => {
    const { deleteContent } =
      await import('@/modules/content/application/deleteContent')
    const { supabaseContentRepository } =
      await import('@/modules/content/infrastructure/supabaseContentRepository')

    vi.mocked(supabaseContentRepository.delete).mockResolvedValue(CONTENT_ID)

    const result = await deleteContent({ id: CONTENT_ID })

    expect(result).toBe(CONTENT_ID)
    expect(supabaseContentRepository.delete).toHaveBeenCalledWith({
      id: CONTENT_ID,
    })
  })

  it("rechaza un id vacío sin llamar al repositorio — la restricción 'solo draft' la impone la función SQL, no esta capa", async () => {
    const { deleteContent } =
      await import('@/modules/content/application/deleteContent')
    const { supabaseContentRepository } =
      await import('@/modules/content/infrastructure/supabaseContentRepository')

    await expect(deleteContent({ id: '' })).rejects.toThrow()
    expect(supabaseContentRepository.delete).not.toHaveBeenCalled()
  })
})

describe('createContentBlock', () => {
  it('delega en supabaseContentBlockRepository.create', async () => {
    const { createContentBlock } =
      await import('@/modules/content/application/createContentBlock')
    const { supabaseContentBlockRepository } =
      await import('@/modules/content/infrastructure/supabaseContentBlockRepository')

    vi.mocked(supabaseContentBlockRepository.create).mockResolvedValue(BLOCK_ID)

    const result = await createContentBlock({
      contentId: CONTENT_ID,
      type: 'rich_text',
      sortOrder: 0,
      config: {},
    })

    expect(result).toBe(BLOCK_ID)
    expect(supabaseContentBlockRepository.create).toHaveBeenCalledOnce()
  })

  it('rechaza sortOrder negativo sin llamar al repositorio', async () => {
    const { createContentBlock } =
      await import('@/modules/content/application/createContentBlock')
    const { supabaseContentBlockRepository } =
      await import('@/modules/content/infrastructure/supabaseContentBlockRepository')

    await expect(
      createContentBlock({
        contentId: CONTENT_ID,
        type: 'rich_text',
        sortOrder: -1,
        config: {},
      }),
    ).rejects.toThrow()

    expect(supabaseContentBlockRepository.create).not.toHaveBeenCalled()
  })
})

describe('upsertCaseDetail', () => {
  it('delega en supabaseCaseDetailRepository.upsert con force dentro de rango', async () => {
    const { upsertCaseDetail } =
      await import('@/modules/content/application/upsertCaseDetail')
    const { supabaseCaseDetailRepository } =
      await import('@/modules/content/infrastructure/supabaseCaseDetailRepository')

    vi.mocked(supabaseCaseDetailRepository.upsert).mockResolvedValue(CONTENT_ID)

    await upsertCaseDetail({
      contentId: CONTENT_ID,
      templateVariant: 'A',
      force: 3,
      client: null,
      sector: null,
      services: null,
      year: null,
      credits: [],
      links: [],
    })

    expect(supabaseCaseDetailRepository.upsert).toHaveBeenCalledOnce()
  })

  it('rechaza force fuera de 1-5 sin llamar al repositorio', async () => {
    const { upsertCaseDetail } =
      await import('@/modules/content/application/upsertCaseDetail')
    const { supabaseCaseDetailRepository } =
      await import('@/modules/content/infrastructure/supabaseCaseDetailRepository')

    await expect(
      upsertCaseDetail({
        contentId: CONTENT_ID,
        templateVariant: 'A',
        force: 7,
        client: null,
        sector: null,
        services: null,
        year: null,
        credits: [],
        links: [],
      }),
    ).rejects.toThrow()

    expect(supabaseCaseDetailRepository.upsert).not.toHaveBeenCalled()
  })
})

describe('upsertContentTranslation', () => {
  it('rechaza un título vacío sin llamar al repositorio', async () => {
    const { upsertContentTranslation } =
      await import('@/modules/content/application/upsertContentTranslation')
    const { supabaseContentTranslationRepository } =
      await import('@/modules/content/infrastructure/supabaseContentTranslationRepository')

    await expect(
      upsertContentTranslation({
        contentId: CONTENT_ID,
        locale: 'es',
        title: '',
        seoTitle: null,
        seoDescription: null,
        summary: null,
      }),
    ).rejects.toThrow()

    expect(supabaseContentTranslationRepository.upsert).not.toHaveBeenCalled()
  })
})

describe('upsertContentBlockTranslation', () => {
  it('delega en supabaseContentBlockRepository.upsertTranslation', async () => {
    const { upsertContentBlockTranslation } =
      await import('@/modules/content/application/upsertContentBlockTranslation')
    const { supabaseContentBlockRepository } =
      await import('@/modules/content/infrastructure/supabaseContentBlockRepository')

    vi.mocked(
      supabaseContentBlockRepository.upsertTranslation,
    ).mockResolvedValue(BLOCK_ID)

    await upsertContentBlockTranslation({
      blockId: BLOCK_ID,
      locale: 'es',
      bodyRichText: 'Cuerpo',
      caption: null,
      quoteText: null,
    })

    expect(
      supabaseContentBlockRepository.upsertTranslation,
    ).toHaveBeenCalledOnce()
  })
})
