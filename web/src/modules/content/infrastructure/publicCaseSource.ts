import type { AppSupabaseClient } from '@/lib/supabase/database'
import { createPublicReadClient } from '@/lib/supabase/publicReadClient'

/**
 * Lectura pública de los datos de un caso para /work/[slug] — mismo
 * criterio que publicContentSource.ts: funciones sueltas sobre
 * createPublicReadClient(), no el supabaseCaseDetailRepository.ts del
 * ABM (ese sigue la sesión del admin, pensado para editar, no para
 * servir la página pública).
 */

export interface PublicCaseDetail {
  // force es un parámetro del motor de feed (arquitectura §4.3), nunca se
  // muestra en el detalle — por eso no se lee aquí.
  client: string | null
}

export async function getPublicCaseDetail(
  contentId: string,
  client: AppSupabaseClient = createPublicReadClient(),
): Promise<PublicCaseDetail | null> {
  const { data, error } = await client
    .from('case_detail')
    .select('client')
    .eq('content_id', contentId)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer el case_detail: ${error.message}`)
  }

  if (!data) return null

  return { client: data.client }
}

export interface PublicCaseCarouselItem {
  mediaId: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
  sortOrder: number
  alt: string
  width: number
  height: number
}

export async function getPublicCaseCarousel(
  contentId: string,
  client: AppSupabaseClient = createPublicReadClient(),
): Promise<PublicCaseCarouselItem[]> {
  const { data, error } = await client
    .from('case_detail_media')
    .select(
      `
      media_id,
      sort_order,
      alt,
      media_asset ( kind, cloudinary_public_id, width, height )
    `,
    )
    .eq('content_id', contentId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(
      `No se pudo leer el carrusel de detalle del caso: ${error.message}`,
    )
  }

  return (data ?? [])
    .filter((row) => row.media_asset !== null)
    .map((row) => ({
      mediaId: row.media_id,
      kind: row.media_asset!.kind,
      cloudinaryPublicId: row.media_asset!.cloudinary_public_id,
      sortOrder: row.sort_order,
      alt: row.alt,
      // width/height siempre deberían venir rellenos (media_asset los
      // exige al registrarse — §9.2), pero el tipo de columna en Postgres
      // los permite NULL; 0 aquí es un valor centinela imposible en la
      // práctica, no una medida real, y widestCarouselRatio ya rechaza
      // width/height <= 0.
      width: row.media_asset!.width ?? 0,
      height: row.media_asset!.height ?? 0,
    }))
}
