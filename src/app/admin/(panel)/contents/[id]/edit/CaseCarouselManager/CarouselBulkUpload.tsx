import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField, AdminHint } from '@/components/admin/AdminField'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { AdminTable } from '@/components/admin/AdminTable'
import { pluralize } from '@/app/admin/_lib/pluralize'
import { IMAGE_LIMITS, VIDEO_LIMITS } from '@/modules/media/domain/mediaLimits'
import type { MediaKind } from '@/modules/shared/domain/mediaKind'

import { CarouselUploadRow } from './CarouselUploadRow'
import type { CarouselBulkUpload as BulkUpload } from './useCarouselBulkUpload'

const MB = 1024 * 1024

const KIND_COPY: Record<
  MediaKind,
  {
    filesLabel: string
    hint: string
    button: (count: number) => string
  }
> = {
  image: {
    filesLabel: 'Imágenes (varias)',
    hint: `JPG, PNG, WebP o AVIF. Máximo ${IMAGE_LIMITS.maxSizeBytes / MB} MB cada una. Sin animaciones.`,
    button: (count) =>
      `Subir ${count} ${pluralize(count, 'imagen', 'imágenes')}`,
  },
  video: {
    filesLabel: 'Vídeos (varios)',
    hint: `MP4, WebM o MOV. Máximo ${VIDEO_LIMITS.maxSizeBytes / MB} MB y ${VIDEO_LIMITS.maxDurationSeconds} s cada uno.`,
    button: (count) => `Subir ${count} ${pluralize(count, 'vídeo', 'vídeos')}`,
  },
}

/**
 * Alta de diapositivas del carrusel de un caso, en lote: el tipo se elige
 * arriba y el lote es de ese tipo. Presentación pura: el estado vive en
 * `useCarouselBulkUpload`. `disabled` viene de fuera (otra operación del
 * editor en marcha).
 */
export function CarouselBulkUpload({
  upload,
  disabled,
}: {
  upload: BulkUpload
  disabled: boolean
}) {
  const {
    kind,
    selectKind,
    fileAccept,
    inputKey,
    rows,
    uploading,
    pendingCount,
    formError,
    selectionNotice,
    csvName,
    csvIssues,
    okCount,
    errorCount,
    handleFilesChange,
    handleCsvChange,
    updateAlt,
    removeRow,
    handleUploadAll,
  } = upload

  const copy = KIND_COPY[kind]
  const locked = uploading || disabled

  return (
    <>
      <AdminField
        label="Tipo de archivo"
        htmlFor="carousel-kind"
        help="Cada lote es de un solo tipo. Cambiarlo vacía el lote."
      >
        <AdminSelect
          id="carousel-kind"
          value={kind}
          disabled={locked}
          onChange={(event) => selectKind(event.target.value as MediaKind)}
        >
          <option value="image">Imagen</option>

          <option value="video">Vídeo</option>
        </AdminSelect>
      </AdminField>

      <AdminField
        label={copy.filesLabel}
        htmlFor="carousel-files"
        help="Se añaden por orden de nombre de archivo (slide-2 antes que slide-10); la columna # lo muestra. Cada selección sustituye a la anterior."
      >
        <AdminInput
          key={inputKey}
          id="carousel-files"
          type="file"
          accept={fileAccept}
          multiple
          disabled={locked}
          onChange={(event) => handleFilesChange(event.target.files)}
        />
      </AdminField>

      <AdminHint>{copy.hint}</AdminHint>

      <AdminField
        label="Plantilla CSV con los alt (opcional): filename,alt"
        htmlFor="carousel-csv"
        help="Sirve también el CSV de los pines (se ignoran las demás columnas). Separador coma o punto y coma. El CSV solo aporta el alt; no cambia el orden."
      >
        <AdminInput
          id="carousel-csv"
          type="file"
          accept=".csv,text/csv"
          disabled={locked}
          onChange={(event) => handleCsvChange(event.target.files)}
        />
      </AdminField>

      {selectionNotice && (
        <AdminMessage kind="warning">{selectionNotice}</AdminMessage>
      )}

      {csvName &&
        csvIssues.map((issue) => (
          <AdminMessage key={issue} kind="warning">
            {issue}
          </AdminMessage>
        ))}

      {rows.length > 0 && (
        <AdminTable>
          <thead>
            <tr>
              <th>#</th>
              <th>Archivo</th>
              <th>Alt (obligatorio)</th>
              <th>Estado</th>
              <th>Quitar</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <CarouselUploadRow
                key={row.key}
                row={row}
                position={index + 1}
                disabled={locked}
                onAltChange={(alt) => updateAlt(row.key, alt)}
                onRemove={() => removeRow(row.key)}
              />
            ))}
          </tbody>
        </AdminTable>
      )}

      {formError && (
        <AdminMessage kind="error" role="alert">
          {formError}
        </AdminMessage>
      )}

      {pendingCount > 0 && (
        <div>
          <AdminButton
            type="button"
            variant="primary"
            disabled={locked}
            onClick={handleUploadAll}
          >
            {uploading ? 'Subiendo lote…' : copy.button(pendingCount)}
          </AdminButton>
        </div>
      )}

      {(okCount > 0 || errorCount > 0) && (
        <AdminMessage kind={errorCount > 0 ? 'warning' : 'success'}>
          {okCount} {pluralize(okCount, 'subida', 'subidas')} correctamente
          {errorCount > 0 && `, ${errorCount} con error`}.
        </AdminMessage>
      )}
    </>
  )
}
