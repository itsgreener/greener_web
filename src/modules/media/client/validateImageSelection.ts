import { imageValidationMessage } from '@/modules/media/domain/imageValidationMessage'
import { validateImageFile } from '@/modules/media/domain/mediaLimits'

export const IMAGE_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

export async function validateImageSelection(
  file: File,
): Promise<string | null> {
  return imageValidationMessage(
    await validateImageFile(file),
    'La imagen seleccionada no es válida.',
  )
}
