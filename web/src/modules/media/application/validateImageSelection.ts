import { validateImageFile } from '../domain/mediaLimits'

export const IMAGE_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

export async function validateImageSelection(
  file: File,
): Promise<string | null> {
  const validation = await validateImageFile(file)

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
      return (
        'Formato de imagen no permitido. ' + 'Utiliza JPG, PNG, WebP o AVIF.'
      )

    default:
      return 'La imagen seleccionada no es válida.'
  }
}
