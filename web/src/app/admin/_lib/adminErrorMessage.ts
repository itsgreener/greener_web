import {
  isDomainError,
  type DomainErrorKind,
} from '@/modules/shared/domain/domainError'
import { PIN_LABEL_REQUIRED_MESSAGE } from '@/modules/pin/domain/pinMessages'

/**
 * Frase con la que el ABM explica cada fallo de negocio. Una acción solo
 * muestra las que declara como «aceptadas»: cualquier otro fallo, incluidos
 * los de infraestructura, sale con el mensaje genérico de esa acción y su
 * detalle va solo al log del servidor.
 */
const DEFAULT_MESSAGES: Readonly<Partial<Record<DomainErrorKind, string>>> = {
  not_found: 'El contenido ya no existe.',
  not_a_case: 'Este contenido no es de tipo Case.',
  not_an_episode: 'Este contenido no es de tipo Episode.',
  episode_locale_only: 'Los episodios solo admiten su idioma principal.',
  image_too_large: 'La imagen supera los 5 MB.',
  video_too_long: 'El vídeo supera los 180 segundos.',
  video_too_large: 'El vídeo supera los 100 MB.',
  pin_label_required: PIN_LABEL_REQUIRED_MESSAGE,
  pin_media_limit: 'Un pin admite hasta 8 medios',
  cover_unsupported: 'Este tipo de contenido no admite imagen de portada.',
  cover_video_unsupported:
    'Solo el contenido libre (Other) admite vídeo de portada.',
  stale_reference:
    'Este medio ha cambiado desde otra pestaña o sesión. Recarga la página antes de sustituirlo.',
  media_in_use:
    'Este medio se sigue usando en otro sitio y no se puede borrar.',
  only_draft_deletable: 'Solo se pueden eliminar contenidos en estado draft.',
  active_version_undeletable:
    'No se puede borrar la versión activa. Publica otra versión antes.',
}

/**
 * Mensaje para el equipo ante una excepción.
 *
 * - `accepted`: fallos de negocio que esta acción sabe explicar, con la frase
 *   por defecto de arriba.
 * - `overrides`: frase propia de esta acción para un fallo (que cuenta como
 *   aceptado), p. ej. «El vídeo supera los 8 s» en lugar del límite genérico.
 * - `fallback`: lo que se muestra si el fallo no es ninguno de los anteriores.
 */
export function adminErrorMessage(
  error: unknown,
  fallback: string,
  accepted: readonly DomainErrorKind[] = [],
  overrides: Readonly<Partial<Record<DomainErrorKind, string>>> = {},
): string {
  if (!isDomainError(error)) {
    return fallback
  }

  const override = overrides[error.kind]

  if (override !== undefined) {
    return override
  }

  return accepted.includes(error.kind)
    ? (DEFAULT_MESSAGES[error.kind] ?? fallback)
    : fallback
}
