'use client'

import { AdminSubheading } from '@/components/admin/AdminCard'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminSelect, AdminInput } from '@/components/admin/AdminControls'
import { AdminField, AdminHint } from '@/components/admin/AdminField'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMediaGrid } from '@/components/admin/AdminMediaItem'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { IMAGE_FILE_ACCEPT } from '@/modules/media/client/validateImageSelection'

import { MediaThumb } from './MediaThumb'
import type { PinMediaManagerProps } from './types'
import { usePinMediaManager } from './usePinMediaManager'

export default function PinMediaManager(props: PinMediaManagerProps) {
  const {
    media,
    kind,
    inputKey,
    file,
    uploading,
    error,
    warning,
    canAddMore,
    videoLimits,
    maxVideoMb,
    contentType,
    selectKind,
    selectFile,
    handleRemove,
    handleUpload,
  } = usePinMediaManager(props)

  return (
    <AdminFormBody>
      <AdminSubheading>Medio del pin</AdminSubheading>

      {media && (
        <AdminMediaGrid>
          <MediaThumb item={media} onRemove={() => handleRemove(media)} />
        </AdminMediaGrid>
      )}

      {canAddMore && (
        <AdminFormBody>
          <AdminField label="Tipo de archivo" htmlFor="pin-media-kind">
            <AdminSelect
              id="pin-media-kind"
              value={kind}
              disabled={uploading}
              onChange={(event) =>
                selectKind(event.target.value as 'image' | 'video')
              }
            >
              <option value="image">Imagen</option>

              <option value="video">
                Vídeo (máx. {videoLimits.maxDurationSeconds} s)
              </option>
            </AdminSelect>
          </AdminField>

          <AdminInput
            key={inputKey}
            type="file"
            aria-label="Archivo del pin"
            accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
            disabled={uploading}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />

          {kind === 'video' ? (
            <AdminHint>
              Vídeo MP4, WebM o MOV, máximo {videoLimits.maxDurationSeconds} s y{' '}
              {maxVideoMb} MB, en uno de los 7 ratios (1:1, 4:3, 4:5, 3:4, 2:3,
              9:16, 16:9).
              {contentType === 'tool'
                ? ' Por encima de 8 s, en el feed solo se verá el poster; el vídeo completo se ve en la ficha de la tool.'
                : ''}
            </AdminHint>
          ) : (
            <AdminHint>
              JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.
            </AdminHint>
          )}

          <div>
            <AdminButton
              type="button"
              variant="primary"
              disabled={uploading || !file}
              onClick={handleUpload}
            >
              {uploading ? 'Subiendo...' : 'Subir'}
            </AdminButton>
          </div>
        </AdminFormBody>
      )}

      {!canAddMore && (
        <AdminMessage>
          Este pin ya tiene su medio. Quítalo para subir otro.
        </AdminMessage>
      )}

      {error && <AdminMessage kind="error">{error}</AdminMessage>}

      {warning && <AdminMessage kind="warning">{warning}</AdminMessage>}
    </AdminFormBody>
  )
}
