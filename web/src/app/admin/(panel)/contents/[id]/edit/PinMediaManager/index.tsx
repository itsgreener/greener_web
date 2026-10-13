'use client'

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
    <div>
      <h4>Medio del pin</h4>

      {media && (
        <MediaThumb item={media} onRemove={() => handleRemove(media)} />
      )}

      {canAddMore && (
        <div>
          <label htmlFor="pin-media-kind">Tipo de archivo</label>

          <select
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
          </select>

          <input
            key={inputKey}
            type="file"
            accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
            disabled={uploading}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />

          {kind === 'video' ? (
            <p>
              Vídeo MP4, WebM o MOV, máximo {videoLimits.maxDurationSeconds} s y{' '}
              {maxVideoMb} MB, en uno de los 7 ratios (1:1, 4:3, 4:5, 3:4, 2:3,
              9:16, 16:9).
              {contentType === 'tool'
                ? ' Por encima de 8 s, en el feed solo se verá el poster; el vídeo completo se ve en la ficha de la tool.'
                : ''}
            </p>
          ) : (
            <p>JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.</p>
          )}

          <button
            type="button"
            disabled={uploading || !file}
            onClick={handleUpload}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        </div>
      )}

      {!canAddMore && (
        <p>Este pin ya tiene su medio. Quítalo para subir otro.</p>
      )}

      {error && <p>{error}</p>}

      {warning && <p>{warning}</p>}
    </div>
  )
}
