'use client'

import { pinRatioSchema } from '@/modules/shared/domain/ratio'
import { IMAGE_FILE_ACCEPT } from '@/modules/media/client/validateImageSelection'

import { CoverPreview } from './CoverPreview'
import type { CoverMediaUploadProps, RatioValue } from './types'
import { useCoverMediaUpload } from './useCoverMediaUpload'

export default function CoverMediaUpload({
  contentId,
  allowVideo,
  coverMedia,
}: CoverMediaUploadProps) {
  const {
    kind,
    inputKey,
    file,
    ratio,
    ratioSource,
    filenameMismatch,
    uploading,
    error,
    warning,
    selectKind,
    selectFile,
    selectRatio,
    handleUpload,
  } = useCoverMediaUpload({ contentId, coverMedia })

  return (
    <div>
      <CoverPreview coverMedia={coverMedia} />

      {allowVideo && (
        <>
          <label htmlFor="cover-kind">Tipo de archivo</label>

          <select
            id="cover-kind"
            value={kind}
            disabled={uploading}
            onChange={(event) =>
              selectKind(event.target.value as 'image' | 'video')
            }
          >
            <option value="image">Imagen</option>

            <option value="video">Vídeo</option>
          </select>
        </>
      )}

      <input
        key={inputKey}
        type="file"
        accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
        disabled={uploading}
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <label htmlFor="cover-ratio">
        Ratio (sugerido a partir del archivo — puedes cambiarlo)
      </label>

      <select
        id="cover-ratio"
        value={ratio}
        disabled={uploading}
        onChange={(event) => selectRatio(event.target.value as RatioValue | '')}
      >
        <option value="">— Selecciona un ratio —</option>

        {pinRatioSchema.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {ratioSource === 'filename' && <small>detectado del nombre</small>}

      {filenameMismatch && <p>{filenameMismatch}</p>}

      <p>
        {kind === 'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'}
      </p>

      <button
        type="button"
        disabled={uploading || !file || !ratio}
        onClick={handleUpload}
      >
        {uploading
          ? 'Subiendo...'
          : coverMedia
            ? 'Sustituir portada'
            : 'Subir portada'}
      </button>

      {error && <p>{error}</p>}

      {warning && <p>{warning}</p>}
    </div>
  )
}
