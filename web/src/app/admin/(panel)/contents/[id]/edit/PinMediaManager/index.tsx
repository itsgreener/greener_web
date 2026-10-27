'use client'

import { AdminSubheading } from '@/components/admin/AdminCard'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMediaGrid } from '@/components/admin/AdminMediaItem'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { MediaUploader } from '@/components/admin/MediaUploader'

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
          <MediaUploader
            kind={kind}
            onKindChange={selectKind}
            kindFieldId="pin-media-kind"
            videoOptionLabel={`Vídeo (máx. ${videoLimits.maxDurationSeconds} s)`}
            inputKey={inputKey}
            fileLabel="Archivo del pin"
            onFileChange={selectFile}
            uploading={uploading}
            hasFile={file !== null}
            hint={
              kind === 'video' ? (
                <>
                  Vídeo MP4, WebM o MOV, máximo {videoLimits.maxDurationSeconds}{' '}
                  s y {maxVideoMb} MB, en uno de los 7 ratios (1:1, 4:3, 4:5,
                  3:4, 2:3, 9:16, 16:9).
                  {contentType === 'tool'
                    ? ' Por encima de 8 s, en el feed solo se verá el poster; el vídeo completo se ve en la ficha de la tool.'
                    : ''}
                </>
              ) : (
                'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'
              )
            }
            submitLabel="Subir"
            onSubmit={handleUpload}
          />
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
