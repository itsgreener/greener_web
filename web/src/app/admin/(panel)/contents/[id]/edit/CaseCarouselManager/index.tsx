'use client'

import { IMAGE_FILE_ACCEPT } from '@/modules/media/client/validateImageSelection'

import { CarouselSlide } from './CarouselSlide'
import type { CaseCarouselManagerProps } from './types'
import { useCaseCarouselManager } from './useCaseCarouselManager'

export default function CaseCarouselManager(props: CaseCarouselManagerProps) {
  const {
    sorted,
    kind,
    alt,
    setAlt,
    inputKey,
    file,
    uploading,
    removingAll,
    busy,
    error,
    warning,
    selectKind,
    selectFile,
    handleRemove,
    handleRemoveAll,
    handleUpload,
  } = useCaseCarouselManager(props)

  return (
    <div>
      <h4>Carrusel de detalle ({sorted.length})</h4>

      <div>
        {sorted.map((item) => (
          <CarouselSlide
            key={item.mediaId}
            item={item}
            disabled={busy || uploading}
            onRemove={() => handleRemove(item)}
          />
        ))}

        {sorted.length === 0 && <p>Todavía no hay carrusel para este caso.</p>}
      </div>

      {sorted.length > 0 && (
        <button
          type="button"
          disabled={removingAll || uploading || busy}
          onClick={handleRemoveAll}
        >
          {removingAll
            ? 'Quitando...'
            : `Quitar todas las diapositivas (${sorted.length})`}
        </button>
      )}

      <label htmlFor="carousel-alt">Alt (obligatorio)</label>

      <input
        id="carousel-alt"
        type="text"
        value={alt}
        disabled={uploading}
        onChange={(event) => setAlt(event.target.value)}
      />

      <label htmlFor="carousel-kind">Tipo de archivo</label>

      <select
        id="carousel-kind"
        value={kind}
        disabled={uploading}
        onChange={(event) =>
          selectKind(event.target.value as 'image' | 'video')
        }
      >
        <option value="image">Imagen</option>

        <option value="video">Vídeo</option>
      </select>

      <input
        key={inputKey}
        type="file"
        accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
        disabled={uploading}
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <p>
        {kind === 'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'}
      </p>

      <button
        type="button"
        disabled={uploading || !file}
        onClick={handleUpload}
      >
        {uploading ? 'Subiendo...' : 'Añadir al carrusel'}
      </button>

      {error && <p>{error}</p>}

      {warning && <p>{warning}</p>}
    </div>
  )
}
