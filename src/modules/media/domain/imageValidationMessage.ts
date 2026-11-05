import type { MediaValidationError } from './mediaLimits'

export const IMAGE_FORMAT_NOT_ALLOWED_MESSAGE =
  'Formato de imagen no permitido. Utiliza JPG, PNG, WebP o AVIF.'

/**
 * Texto para el admin de un error de `validateImageFile`. Lo usan la
 * validación previa del navegador (validateImageSelection) y la
 * verificación en servidor (cloudinaryServer): antes cada una tenía su copia
 * del `switch`, y solo se distinguían en el mensaje de «cualquier otro
 * error», que es el parámetro `fallback`.
 */
export function imageValidationMessage(
  validation: MediaValidationError | null,
  fallback: string,
): string | null {
  if (!validation) {
    return null
  }

  switch (validation.code) {
    case 'IMAGE_TOO_LARGE':
      return `La imagen supera el límite de ${
        validation.maxBytes / 1024 / 1024
      } MB.`

    case 'GIF_NOT_ALLOWED':
      return (
        'No se permiten archivos GIF. ' +
        'Si necesitas animación, súbela como vídeo.'
      )

    case 'ANIMATED_IMAGE_NOT_ALLOWED':
      return (
        'No se permiten imágenes animadas. ' +
        'Si necesitas animación, súbela como vídeo.'
      )

    case 'IMAGE_FORMAT_NOT_ALLOWED':
      return IMAGE_FORMAT_NOT_ALLOWED_MESSAGE

    default:
      return fallback
  }
}
