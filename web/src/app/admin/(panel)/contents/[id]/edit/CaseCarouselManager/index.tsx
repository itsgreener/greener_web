'use client'

import { AdminSubheading } from '@/components/admin/AdminCard'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMediaGrid } from '@/components/admin/AdminMediaItem'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { MediaUploader } from '@/components/admin/MediaUploader'

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
              ? 'Quitando…'
              : `Quitar todas las diapositivas (${sorted.length})`}
          </AdminButton>
        </div>
      )}

      <MediaUploader
        kind={kind}
        onKindChange={selectKind}
        kindFieldId="carousel-kind"
        videoOptionLabel="Vídeo"
        inputKey={inputKey}
        fileLabel="Archivo de la diapositiva"
        onFileChange={selectFile}
        uploading={uploading}
        hasFile={file !== null}
        before={
          <AdminField label="Alt (obligatorio)" htmlFor="carousel-alt">
            <AdminInput
              id="carousel-alt"
              type="text"
              value={alt}
              disabled={uploading}
              onChange={(event) => setAlt(event.target.value)}
            />
          </AdminField>
        }
        hint={
          kind === 'video'
            ? 'Vídeo, máximo 100 MB / 180 s.'
            : 'JPG, PNG, WebP o AVIF. Máximo 5 MB. Sin animaciones.'
        }
        submitLabel="Añadir al carrusel"
        onSubmit={handleUpload}
      />

      {error && <AdminMessage kind="error">{error}</AdminMessage>}

      {warning && <AdminMessage kind="warning">{warning}</AdminMessage>}
    </AdminFormBody>
  )
}
