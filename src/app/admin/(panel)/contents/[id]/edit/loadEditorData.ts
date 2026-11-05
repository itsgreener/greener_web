import {
  caseCarousels,
  caseDetails,
  contents,
  contentTranslations,
  episodes,
  others,
} from '@/modules/content/container'
import { contentWarming } from '@/modules/media/container'
import { htmlPackages } from '@/modules/packages/container'
import { pins as pinRepository } from '@/modules/pin/container'
import {
  contentCapabilities,
  type ContentCapabilities,
} from '@/app/admin/_lib/contentCapabilities'

/**
 * Todo lo que necesita el editor de un contenido, cargado de una vez. La
 * página solo compone; aquí vive qué se lee según el tipo (un caso lleva
 * ficha y carrusel, un episodio su episodio, una página satélite su paquete…).
 * Devuelve `null` si el contenido no existe.
 */
export async function loadEditorData(id: string) {
  const content = await contents.getById(id)

  if (!content) return null

  // Un `other` lleva su subtipo (plan de other, §7): una newsletter no tiene
  // pines, paquete ni página; una página satélite tiene paquete HTML y pines.
  const otherDetail =
    content.type === 'other' ? await others.getByContentId(content.id) : null

  const otherKind = otherDetail?.kind ?? null

  const capabilities: ContentCapabilities = contentCapabilities(
    content.type,
    otherKind,
  )

  // Frecuencias de los demás Other publicados, para el aviso de ocupación.
  const otherFrequencies = otherDetail
    ? await others
        .listPublishedFrequencies(content.id)
        .catch((error: unknown) => {
          console.error('Admin · loadEditorData:', error)

          return []
        })
    : []

  const [
    translations,
    caseDetail,
    caseCarousel,
    episode,
    packageVersions,
    pins,
  ] = await Promise.all([
    contentTranslations.listByContentId(content.id),

    content.type === 'case'
      ? caseDetails.getByContentId(content.id)
      : Promise.resolve(null),

    content.type === 'case'
      ? caseCarousels.listByContentId(content.id)
      : Promise.resolve([]),

    content.type === 'episode'
      ? episodes.getByContentId(content.id)
      : Promise.resolve(null),

    capabilities.hasPackage
      ? htmlPackages.listVersions(content.id)
      : Promise.resolve([]),

    capabilities.hasPins
      ? pinRepository.listByContentId(content.id)
      : Promise.resolve([]),
  ])

  let pendingWarming: number | null = null

  try {
    pendingWarming = await contentWarming.countPendingWarming(content.id)
  } catch (error) {
    console.error('Admin · loadEditorData:', error)
  }

  return {
    content,
    otherDetail,
    otherKind,
    otherFrequencies,
    capabilities,
    translations,
    caseDetail,
    caseCarousel,
    episode,
    packageVersions,
    pins,
    pendingWarming,
  }
}
