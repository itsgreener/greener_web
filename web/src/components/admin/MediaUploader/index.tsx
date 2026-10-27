'use client'

import type { ReactNode } from 'react'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField, AdminHint } from '@/components/admin/AdminField'
import { IMAGE_FILE_ACCEPT } from '@/modules/media/client/validateImageSelection'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'

type Props = {
  kind: MediaKind
  onKindChange: (kind: MediaKind) => void
  /** `id` del desplegable de tipo, para enlazarlo con su etiqueta. */
  kindFieldId: string
  /** Texto de la opción de vídeo («Vídeo», «Vídeo (máx. 8 s)»…). */
  videoOptionLabel: string
  /** Cambia al terminar una subida para vaciar el `<input type="file">`. */
  inputKey: number
  /** Nombre accesible del selector de archivo. */
  fileLabel: string
  onFileChange: (file: File | null) => void
  uploading: boolean
  hasFile: boolean
  /** Texto de ayuda bajo el selector (suele depender del tipo elegido). */
  hint: ReactNode
  submitLabel: string
  onSubmit: () => void
  /** Campos que van antes del selector de tipo (el alt del carrusel). */
  before?: ReactNode
}

/**
 * Formulario de subida de un medio del ABM: selector imagen/vídeo, selector de
 * archivo, ayuda y botón «Subir». Lo comparten el medio de un pin y el
 * carrusel de un caso; cada uno pone sus textos y qué se hace al subir
 * (`useMediaUpload`). Devuelve un fragmento: los campos caen en el contenedor
 * de quien lo usa.
 */
export function MediaUploader({
  kind,
  onKindChange,
  kindFieldId,
  videoOptionLabel,
  inputKey,
  fileLabel,
  onFileChange,
  uploading,
  hasFile,
  hint,
  submitLabel,
  onSubmit,
  before,
}: Props) {
  return (
    <>
      {before}

      <AdminField label="Tipo de archivo" htmlFor={kindFieldId}>
        <AdminSelect
          id={kindFieldId}
          value={kind}
          disabled={uploading}
          onChange={(event) => onKindChange(event.target.value as MediaKind)}
        >
          <option value="image">Imagen</option>

          <option value="video">{videoOptionLabel}</option>
        </AdminSelect>
      </AdminField>

      <AdminInput
        key={inputKey}
        type="file"
        aria-label={fileLabel}
        accept={kind === 'video' ? 'video/*' : IMAGE_FILE_ACCEPT}
        disabled={uploading}
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
      />

      <AdminHint>{hint}</AdminHint>

      <div>
        <AdminButton
          type="button"
          variant="primary"
          disabled={uploading || !hasFile}
          onClick={onSubmit}
        >
          {uploading ? 'Subiendo…' : submitLabel}
        </AdminButton>
      </div>
    </>
  )
}
