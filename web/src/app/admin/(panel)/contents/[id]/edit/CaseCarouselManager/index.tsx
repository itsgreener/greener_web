'use client'

import { AdminSubheading } from '@/components/admin/AdminCard'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField, AdminHint } from '@/components/admin/AdminField'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMediaGrid } from '@/components/admin/AdminMediaItem'
import { AdminMessage } from '@/components/admin/AdminMessage'
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
    <AdminFormBody>
      <AdminSubheading>Carrusel de detalle ({sorted.length})</AdminSubheading>

      {sorted.length > 0 ? (
        <AdminMediaGrid>
          {sorted.map((item) => (
            <CarouselSlide
              key={item.mediaId}
              item={item}
              disabled={busy || uploading}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </AdminMediaGrid>
      ) : (
        <AdminMessage>Todavía no hay carrusel para este caso.</AdminMessage>
      )}

      {sorted.length > 0 && (
        <div>
          <AdminButton
            type="button"
            variant="danger"
            disabled={removingAll || uploading || busy}
            onClick={handleRemoveAll}
          >
            {removingAll
              ? 'Quitando...'
              : `Quitar todas las diapositivas (${sorted.length})`}
          </AdminButton>
        </div>
      )}

      <AdminField label="Alt (obligatorio)" htmlFor="carousel-alt">
        <AdminInput
          id="carousel-alt"
          type="text"
          value={alt}
          disabled={uploading}
          onChange={(event) => setAlt(event.target.value)}
        />
      </AdminField>

      <AdminField label="Tipo de archivo" htmlFor="carousel-kind">
        <AdminSelect
          id="carousel-kind"
          value={kind}
          disabled={uploading}
          onChange={(event) =>
            selectKind(event.target.value as 'image' | 'video')
          }
        >
          <option value="image">Imagen</option>

          <option value="video">Vídeo</option>
        </AdminSelect>
      </AdminField>

      <AdminInput
        key={inputKey}
        type="file"
        aria-label="Archivo de la diapositiva"
        accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
        disabled={uploading}
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <AdminHint>
        {kind === 'video'
          ? 'Vídeo, máximo 100 MB / 180 s.'
          : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'}
      </AdminHint>

      <div>
        <AdminButton
          type="button"
          variant="primary"
          disabled={uploading || !file}
          onClick={handleUpload}
        >
          {uploading ? 'Subiendo...' : 'Añadir al carrusel'}
        </AdminButton>
      </div>

      {error && <AdminMessage kind="error">{error}</AdminMessage>}

      {warning && <AdminMessage kind="warning">{warning}</AdminMessage>}
    </AdminFormBody>
  )
}
