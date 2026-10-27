import type { OtherKind } from '@/modules/content/domain/otherSchema'
import type { ContentType } from '@/modules/shared/domain/contentType'

/**
 * Qué admite cada tipo de contenido en el editor del ABM. Es el único sitio
 * que lo decide: un tipo nuevo (o un subtipo de Other nuevo) se da de alta
 * aquí y no en cada pantalla. Solo lo usa el admin; la web pública no
 * necesita esta tabla.
 */
export interface ContentCapabilities {
  /** Se traduce a todos los idiomas (no solo al principal). */
  allLocales: boolean

  /** La traducción lleva `highlight` y `body` (formato de detalle tipo B). */
  hasHighlightAndBody: boolean

  /** La traducción lleva `summary` (el texto de apoyo del feed y del detalle). */
  hasSummary: boolean

  /** La traducción lleva título y descripción SEO. */
  hasSeo: boolean

  /** Paquete HTML sin portada: tipo A (tool, insight) y página satélite. */
  hasPackage: boolean

  /** Tiene pines en el feed (una newsletter no). */
  hasPins: boolean

  /** Se puede generar un enlace de vista previa firmado antes de publicar. */
  hasPreview: boolean
}

/**
 * `otherKind` es el subtipo de un `other` y `null` en el resto de tipos (o en
 * un `other` sin subtipo, que no se puede publicar).
 */
export function contentCapabilities(
  type: ContentType,
  otherKind: OtherKind | null,
): ContentCapabilities {
  return {
    // Episodio y other se muestran en un solo idioma: el principal. Un other
    // no tiene versión por idioma en el feed (plan de other, §3).
    allLocales: type !== 'episode' && type !== 'other',
    // especificacion-final-formato-detalle.md §3: son campos propios del
    // formato de detalle tipo B (caso y episodio).
    hasHighlightAndBody: type === 'case' || type === 'episode',
    // Case y episodio no usan summary (su texto es highlight + body) y una
    // página satélite solo necesita título: su contenido es el paquete.
    hasSummary: type !== 'case' && type !== 'episode' && otherKind !== 'page',
    // El SEO de un other no se usa: la newsletter no tiene página y la
    // satélite saca su head del manifest del paquete.
    hasSeo: type !== 'other',
    // Una newsletter no tiene página; una página satélite sí tiene paquete.
    hasPackage: type === 'tool' || type === 'insight' || otherKind === 'page',
    hasPins: otherKind !== 'newsletter',
    hasPreview: type === 'case' || type === 'episode',
  }
}
