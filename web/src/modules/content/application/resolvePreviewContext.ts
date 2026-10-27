import type { ContentType } from '@/modules/shared/domain/contentType'
import type { Locale } from '@/modules/shared/domain/locale'

import type { PublicContent } from '@/modules/content/domain/publicContent'
import type { PublicContentReader } from '@/modules/content/domain/publicContentReader'

export interface PreviewResolution {
  content: PublicContent | null
  /**
   * El lector con el que seguir leyendo (carrusel, episodio…): el de vista
   * previa si el token valió, el público normal si no.
   */
  reader: PublicContentReader
  isPreview: boolean
}

/**
 * Punto único de entrada para las plantillas de detalle públicas
 * (/work, /tools, /insights, /variety): decide si la petición trae un
 * token de preview válido (arquitectura §15.3) para ESTE slug, y si es así
 * lee con el lector privilegiado (salta RLS: ve borradores) y lo devuelve
 * para que las páginas lo reutilicen en sus lecturas secundarias — la RLS
 * pública las bloquearía igual.
 *
 * Sin token, o con uno inválido/caducado/ajeno a este slug, se cae al
 * camino público normal: el mismo resultado que si esta función no
 * existiera.
 */
export function makeResolvePreviewContext({
  publicReader,
  previewReader,
  decodePreviewToken,
}: {
  publicReader: PublicContentReader
  previewReader: () => PublicContentReader
  /** Devuelve el id del contenido si el token es válido; null si no. */
  decodePreviewToken: (token: string) => string | null
}) {
  return async function resolvePreviewContext(
    slug: string,
    previewToken: string | undefined,
    locale?: Locale,
  ): Promise<PreviewResolution> {
    if (previewToken) {
      const contentId = decodePreviewToken(previewToken)

      if (contentId) {
        const reader = previewReader()
        const content = await reader.contentBySlug(slug, locale)

        // El token demuestra conocer el secreto del servidor para ESE
        // contentId — si no coincide con lo que hay en este slug (p.ej. el
        // slug cambió después de generar el link), no se sirve nada con
        // privilegios.
        if (content && content.id === contentId) {
          return { content, reader, isPreview: true }
        }
      }
    }

    const content = await publicReader.contentBySlug(slug, locale)

    return { content, reader: publicReader, isPreview: false }
  }
}

/**
 * Filtra una resolución por tipo de contenido: las rutas de detalle solo
 * sirven los tipos que les corresponden (/work, casos y episodios; /tools,
 * tools). Un slug de otro tipo se trata como inexistente (`null`).
 */
export function previewOfType(
  resolution: PreviewResolution,
  types: readonly ContentType[],
): (PreviewResolution & { content: PublicContent }) | null {
  const { content } = resolution
  if (!content || !types.includes(content.type)) return null
  return { ...resolution, content }
}
