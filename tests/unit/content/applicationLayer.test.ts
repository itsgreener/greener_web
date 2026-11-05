import { describe, it, expect, vi } from 'vitest'

import type { MediaCleanup } from '@/modules/media/domain/mediaCleanupPorts'
import { makeCreateContent } from '@/modules/content/application/createContent'
import { makeDeleteContent } from '@/modules/content/application/deleteContent'
import {
  makePublishContent,
  makeScheduleContent,
} from '@/modules/content/application/publishContent'
import { makeUnpublishContent } from '@/modules/content/application/unpublishContent'
import { makeUpdateContent } from '@/modules/content/application/updateContent'
import { makeUpsertCaseDetail } from '@/modules/content/application/upsertCaseDetail'
import { makeUpsertContentTranslation } from '@/modules/content/application/upsertContentTranslation'

/**
 * La capa application/ de `content` recibe sus puertos por parámetro
 * (`makeX({ contents, … })`), así que se prueba con repositorios falsos, sin
 * mockear módulos.
 *
 * Lo que se prueba en cada caso es el contrato real: con datos válidos, se
 * llama al repositorio con los datos ya parseados/normalizados por zod; con
 * datos inválidos, el repositorio NUNCA se llega a tocar.
 */

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

function fakeContents() {
  return {
    list: vi.fn(),
    counts: vi.fn(),
    getById: vi.fn(),
    createDraft: vi.fn(async () => CONTENT_ID),
    update: vi.fn(async () => CONTENT_ID),
    delete: vi.fn(async () => CONTENT_ID),
    publish: vi.fn(async () => CONTENT_ID),
    schedule: vi.fn<
      (input: { id: string; publishAt: Date }) => Promise<string>
    >(async () => CONTENT_ID),
    unpublish: vi.fn(async () => CONTENT_ID),
  }
}

function fakeCleanup() {
  return {
    snapshotPinMedia: vi.fn<MediaCleanup['snapshotPinMedia']>(async () => []),
    snapshotContentMedia: vi.fn<MediaCleanup['snapshotContentMedia']>(
      async () => [],
    ),
    snapshotMedia: vi.fn<MediaCleanup['snapshotMedia']>(async () => []),
    purgeRemovedMedia: vi.fn<MediaCleanup['purgeRemovedMedia']>(async () => ({
      purged: 0,
      failed: 0,
    })),
    discardUnregisteredUpload: vi.fn<MediaCleanup['discardUnregisteredUpload']>(
      async () => false,
    ),
  } satisfies MediaCleanup
}

const fakeWarm = () => ({
  forContent: vi.fn(async () => {}),
  forPin: vi.fn(async () => {}),
})

describe('createContent', () => {
  it('valida con zod y delega en createDraft con los datos recortados', async () => {
    const contents = fakeContents()
    const createContent = makeCreateContent({ contents })

    const result = await createContent({
      type: 'case',
      slug: '  mi-caso  ',
      defaultLocale: 'es',
      title: '  Mi caso  ',
    })

    expect(result).toBe(CONTENT_ID)
    expect(contents.createDraft).toHaveBeenCalledWith({
      type: 'case',
      slug: 'mi-caso',
      defaultLocale: 'es',
      title: 'Mi caso',
    })
  })

  it('rechaza un slug inválido sin llegar a llamar al repositorio', async () => {
    const contents = fakeContents()
    const createContent = makeCreateContent({ contents })

    await expect(
      createContent({
        type: 'case',
        slug: 'Slug Inválido',
        defaultLocale: 'es',
        title: 'Mi caso',
      }),
    ).rejects.toThrow()

    expect(contents.createDraft).not.toHaveBeenCalled()
  })
})

describe('updateContent', () => {
  it('delega en update sin permitir cambiar el tipo', async () => {
    const contents = fakeContents()
    const updateContent = makeUpdateContent({ contents })

    await updateContent({
      id: CONTENT_ID,
      slug: 'nuevo-slug',
      defaultLocale: 'en',
    })

    expect(contents.update).toHaveBeenCalledWith({
      id: CONTENT_ID,
      slug: 'nuevo-slug',
      defaultLocale: 'en',
    })
  })

  it('rechaza un id que no sea uuid sin llamar al repositorio', async () => {
    const contents = fakeContents()
    const updateContent = makeUpdateContent({ contents })

    await expect(
      updateContent({ id: 'no-es-uuid', slug: 'slug', defaultLocale: 'es' }),
    ).rejects.toThrow()

    expect(contents.update).not.toHaveBeenCalled()
  })
})

describe('deleteContent', () => {
  it('lee los medios ANTES de borrar y purga después los archivos huérfanos', async () => {
    const contents = fakeContents()
    const cleanup = fakeCleanup()
    const refs = [
      { mediaId: 'm1', cloudinaryPublicId: 'greener/content/a', kind: 'image' },
    ] as const
    const order: string[] = []
    cleanup.snapshotContentMedia.mockImplementation(async () => {
      order.push('snapshot')
      return [...refs]
    })
    contents.delete.mockImplementation(async () => {
      order.push('delete')
      return CONTENT_ID
    })
    cleanup.purgeRemovedMedia.mockImplementation(async () => {
      order.push('purge')
      return { purged: 1, failed: 0 }
    })
    const deleteContent = makeDeleteContent({ contents, cleanup })

    const result = await deleteContent({ id: CONTENT_ID })

    expect(result).toEqual({ purged: 1, failed: 0 })
    expect(contents.delete).toHaveBeenCalledWith({ id: CONTENT_ID })
    expect(cleanup.snapshotContentMedia).toHaveBeenCalledWith(CONTENT_ID)
    expect(cleanup.purgeRemovedMedia).toHaveBeenCalledWith(refs)
    expect(order).toEqual(['snapshot', 'delete', 'purge'])
  })

  it('si la base de datos rechaza el borrado, lanza y no toca el almacén de archivos', async () => {
    const contents = fakeContents()
    const cleanup = fakeCleanup()
    contents.delete.mockRejectedValue(new Error('solo borradores'))
    const deleteContent = makeDeleteContent({ contents, cleanup })

    await expect(deleteContent({ id: CONTENT_ID })).rejects.toThrow(
      'solo borradores',
    )

    expect(cleanup.purgeRemovedMedia).not.toHaveBeenCalled()
  })

  it("rechaza un id vacío sin llamar al repositorio — la restricción 'solo draft' la impone la función SQL, no esta capa", async () => {
    const contents = fakeContents()
    const cleanup = fakeCleanup()
    const deleteContent = makeDeleteContent({ contents, cleanup })

    await expect(deleteContent({ id: '' })).rejects.toThrow()

    expect(contents.delete).not.toHaveBeenCalled()
    expect(cleanup.snapshotContentMedia).not.toHaveBeenCalled()
  })
})

describe('upsertCaseDetail', () => {
  it('delega en el repositorio con force dentro de rango — solo force + client (especificacion-final-formato-detalle.md §3, §6)', async () => {
    const caseDetails = {
      getByContentId: vi.fn(),
      upsert: vi.fn(async () => CONTENT_ID),
    }
    const upsertCaseDetail = makeUpsertCaseDetail({ caseDetails })

    await upsertCaseDetail({ contentId: CONTENT_ID, force: 3, client: null })

    expect(caseDetails.upsert).toHaveBeenCalledOnce()
  })

  it('rechaza force fuera de 1-5 sin llamar al repositorio', async () => {
    const caseDetails = { getByContentId: vi.fn(), upsert: vi.fn() }
    const upsertCaseDetail = makeUpsertCaseDetail({ caseDetails })

    await expect(
      upsertCaseDetail({ contentId: CONTENT_ID, force: 7, client: null }),
    ).rejects.toThrow()

    expect(caseDetails.upsert).not.toHaveBeenCalled()
  })
})

describe('upsertContentTranslation', () => {
  const translation = {
    contentId: CONTENT_ID,
    locale: 'es' as const,
    seoTitle: null,
    seoDescription: null,
    summary: null,
    highlight: null,
    body: null,
  }

  it('rechaza un título vacío sin llamar al repositorio', async () => {
    const translations = { listByContentId: vi.fn(), upsert: vi.fn() }
    const upsertContentTranslation = makeUpsertContentTranslation({
      translations,
    })

    await expect(
      upsertContentTranslation({ ...translation, title: '' }),
    ).rejects.toThrow()

    expect(translations.upsert).not.toHaveBeenCalled()
  })

  it('acepta highlight/body explícitos (§3: campos propios del formato tipo B) y delega en el repositorio', async () => {
    const translations = {
      listByContentId: vi.fn(),
      upsert: vi.fn(async () => CONTENT_ID),
    }
    const upsertContentTranslation = makeUpsertContentTranslation({
      translations,
    })

    await upsertContentTranslation({
      ...translation,
      title: 'Título',
      highlight: 'Subtítulo',
      body: 'Cuerpo del caso',
    })

    expect(translations.upsert).toHaveBeenCalledOnce()
  })
})

describe('publishContent', () => {
  it('publica y, ya hecho, encarga el calentamiento de los vídeos', async () => {
    const contents = fakeContents()
    const warm = fakeWarm()
    const order: string[] = []
    contents.publish.mockImplementation(async () => {
      order.push('publish')
      return CONTENT_ID
    })
    warm.forContent.mockImplementation(async () => {
      order.push('warm')
    })
    const publishContent = makePublishContent({ contents, warm })

    const result = await publishContent({ id: CONTENT_ID })

    expect(result).toBe(CONTENT_ID)
    expect(contents.publish).toHaveBeenCalledWith({ id: CONTENT_ID })
    expect(warm.forContent).toHaveBeenCalledWith(CONTENT_ID)
    expect(order).toEqual(['publish', 'warm'])
  })

  it('si publicar falla, lanza y no se calienta nada', async () => {
    const contents = fakeContents()
    const warm = fakeWarm()
    contents.publish.mockRejectedValue(new Error('package_required'))
    const publishContent = makePublishContent({ contents, warm })

    await expect(publishContent({ id: CONTENT_ID })).rejects.toThrow(
      'package_required',
    )

    expect(warm.forContent).not.toHaveBeenCalled()
  })

  it('rechaza un id inválido sin llamar al repositorio', async () => {
    const contents = fakeContents()
    const warm = fakeWarm()
    const publishContent = makePublishContent({ contents, warm })

    await expect(publishContent({ id: 'no-es-uuid' })).rejects.toThrow()

    expect(contents.publish).not.toHaveBeenCalled()
    expect(warm.forContent).not.toHaveBeenCalled()
  })
})

describe('scheduleContent', () => {
  it('programa con una fecha futura y encarga el calentamiento', async () => {
    const contents = fakeContents()
    const warm = fakeWarm()
    const scheduleContent = makeScheduleContent({ contents, warm })

    const future = new Date(Date.now() + 60_000)

    const result = await scheduleContent({ id: CONTENT_ID, publishAt: future })

    expect(result).toBe(CONTENT_ID)
    expect(contents.schedule).toHaveBeenCalledOnce()

    const calledWith = contents.schedule.mock.calls[0][0] as {
      id: string
      publishAt: Date
    }
    expect(calledWith.id).toBe(CONTENT_ID)
    expect(calledWith.publishAt).toBeInstanceOf(Date)
    expect(warm.forContent).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('rechaza una fecha pasada sin llamar al repositorio ni calentar', async () => {
    const contents = fakeContents()
    const warm = fakeWarm()
    const scheduleContent = makeScheduleContent({ contents, warm })

    const past = new Date(Date.now() - 60_000)

    await expect(
      scheduleContent({ id: CONTENT_ID, publishAt: past }),
    ).rejects.toThrow()

    expect(contents.schedule).not.toHaveBeenCalled()
    expect(warm.forContent).not.toHaveBeenCalled()
  })
})

describe('unpublishContent', () => {
  it('delega en unpublish', async () => {
    const contents = fakeContents()
    const unpublishContent = makeUnpublishContent({ contents })

    const result = await unpublishContent({ id: CONTENT_ID })

    expect(result).toBe(CONTENT_ID)
    expect(contents.unpublish).toHaveBeenCalledWith({ id: CONTENT_ID })
  })

  it('rechaza un id inválido sin llamar al repositorio', async () => {
    const contents = fakeContents()
    const unpublishContent = makeUnpublishContent({ contents })

    await expect(unpublishContent({ id: 'no-es-uuid' })).rejects.toThrow()

    expect(contents.unpublish).not.toHaveBeenCalled()
  })
})
