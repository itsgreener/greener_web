'use client'

import { AdminSubheading } from '@/components/admin/AdminCard'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMediaGrid } from '@/components/admin/AdminMediaItem'
import { AdminMessage } from '@/components/admin/AdminMessage'

import { CarouselBulkUpload } from './CarouselBulkUpload'
import { CarouselOrderBar } from './CarouselOrderBar'
import { CarouselSlide } from './CarouselSlide'
import { CarouselSlideEditor } from './CarouselSlideEditor'
import type { CaseCarouselManagerProps } from './types'
import { useCaseCarouselManager } from './useCaseCarouselManager'

export default function CaseCarouselManager(props: CaseCarouselManagerProps) {
  const {
    sorted,
    upload,
    order,
    editor,
    locked,
    removingAll,
    busy,
    error,
    warning,
    handleRemove,
    handleRemoveAll,
  } = useCaseCarouselManager(props)

  const uploading = upload.uploading
  const editingPosition = editor.editing
    ? sorted.findIndex((item) => item.mediaId === editor.editing?.mediaId) + 1
    : 0

  return (
    <AdminFormBody>
      <AdminSubheading>Carrusel de detalle ({sorted.length})</AdminSubheading>

      {sorted.length > 0 ? (
        <AdminMediaGrid>
          {sorted.map((item, index) => (
            <CarouselSlide
              key={item.mediaId}
              item={item}
              position={index + 1}
              total={sorted.length}
              // Mover es lo único permitido con un orden sin guardar.
              disabled={busy || uploading}
              active={editor.editing?.mediaId === item.mediaId}
              onRemove={() => handleRemove(item)}
              onEdit={() => editor.open(item)}
              onMoveBy={(delta) => order.moveBy(item.mediaId, delta)}
              onMoveTo={(position) => order.moveTo(item.mediaId, position)}
              locked={locked}
            />
          ))}
        </AdminMediaGrid>
      ) : (
        <AdminMessage>Todavía no hay carrusel para este caso.</AdminMessage>
      )}

      {order.dirty && (
        <CarouselOrderBar order={order} disabled={busy || uploading} />
      )}

      {editor.editing && (
        <CarouselSlideEditor
          editor={editor}
          position={editingPosition}
          disabled={busy || uploading}
        />
      )}

      {sorted.length > 0 && (
        <div>
          <AdminButton
            type="button"
            variant="error"
            disabled={removingAll || uploading || busy || locked}
            onClick={handleRemoveAll}
          >
            {removingAll
              ? 'Quitando…'
              : `Quitar todas las diapositivas (${sorted.length})`}
          </AdminButton>
        </div>
      )}

      {error && <AdminMessage kind="error">{error}</AdminMessage>}

      {warning && <AdminMessage kind="warning">{warning}</AdminMessage>}

      <AdminSubheading>Añadir diapositivas</AdminSubheading>

      <CarouselBulkUpload upload={upload} disabled={busy || locked} />
    </AdminFormBody>
  )
}
