import type { SupabaseClient } from '@supabase/supabase-js'
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
  client: SupabaseClient = createPublicReadClient(),
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
}

interface CaseCarouselRow {
  media_id: string
  sort_order: number
  alt: string
  media_asset: {
    kind: 'image' | 'video'
    cloudinary_public_id: string
  } | null
}

export async function getPublicCaseCarousel(
  contentId: string,
  client: SupabaseClient = createPublicReadClient(),
): Promise<PublicCaseCarouselItem[]> {
  const { data, error } = await client
    .from('case_detail_media')
    .select(
      `
      media_id,
      sort_order,
      alt,
      media_asset ( kind, cloudinary_public_id )
    `,
    )
    .eq('content_id', contentId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(
      `No se pudo leer el carrusel de detalle del caso: ${error.message}`,
    )
  }

  return ((data ?? []) as unknown as CaseCarouselRow[])
    .filter((row) => row.media_asset !== null)
    .map((row) => ({
      mediaId: row.media_id,
      kind: row.media_asset!.kind,
      cloudinaryPublicId: row.media_asset!.cloudinary_public_id,
      sortOrder: row.sort_order,
      alt: row.alt,
    }))
}
