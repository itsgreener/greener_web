import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField, AdminHint } from '@/components/admin/AdminField'
import { AdminSubheading } from '@/components/admin/AdminCard'
import { IMAGE_LIMITS, VIDEO_LIMITS } from '@/modules/media/domain/mediaLimits'

import type { CarouselSlideEditor as SlideEditor } from './useCarouselSlideEditor'

const MB = 1024 * 1024

const FILE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  '.mp4',
  '.webm',
  '.mov',
].join(',')

/**
 * Panel de edición de la diapositiva seleccionada: alt y, si se quiere,
 * archivo nuevo. Presentación pura: el estado vive en `useCarouselSlideEditor`.
 */
export function CarouselSlideEditor({
  editor,
  position,
  disabled,
}: {
  editor: SlideEditor
  position: number
  disabled: boolean
}) {
  return (
    <>
      <AdminSubheading>Editar diapositiva {position}</AdminSubheading>

      <AdminField
        label="Alt (obligatorio)"
        htmlFor="carousel-edit-alt"
        help="Descripción de la diapositiva, en inglés como el resto del caso."
      >
        <AdminInput
          id="carousel-edit-alt"
          type="text"
          value={editor.alt}
          disabled={disabled}
          onChange={(event) => editor.setAlt(event.target.value)}
        />
      </AdminField>

      <AdminField
        label="Archivo nuevo (opcional)"
        htmlFor="carousel-edit-file"
        help="Si lo eliges, sustituye al actual en el mismo sitio del carrusel y el archivo anterior se borra. Puede ser de otro tipo (imagen por vídeo o al revés)."
      >
        <AdminInput
          key={editor.inputKey}
          id="carousel-edit-file"
          type="file"
          accept={FILE_ACCEPT}
          disabled={disabled}
          onChange={(event) =>
            editor.selectFile(event.target.files?.[0] ?? null)
          }
        />
      </AdminField>

      <AdminHint>
        Imágenes: JPG, PNG, WebP o AVIF, máximo {IMAGE_LIMITS.maxSizeBytes / MB}{' '}
        MB, sin animaciones. Vídeos: MP4, WebM o MOV, máximo{' '}
        {VIDEO_LIMITS.maxSizeBytes / MB} MB y {VIDEO_LIMITS.maxDurationSeconds}{' '}
        s.
      </AdminHint>

      <div>
        <AdminButton
          type="button"
          variant="primary"
          disabled={disabled}
          onClick={editor.save}
        >
          Guardar cambios
        </AdminButton>{' '}
        <AdminButton type="button" disabled={disabled} onClick={editor.cancel}>
          Cancelar
        </AdminButton>
      </div>
    </>
  )
}
