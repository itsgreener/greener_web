'use client'

import type { ContentType } from '@/modules/shared/domain/contentType'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { AdminField, AdminFieldset } from '@/components/admin/AdminField'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { LocaleOptions, RatioOptions } from '@/components/admin/AdminOptions'
import { AdminTable } from '@/components/admin/AdminTable'

import { BulkPinRow } from './BulkPinRow'
import { useBulkPinUpload } from './useBulkPinUpload'

type Props = {
  // Huecos de pin que quedan en el contenido (máximo 8 por contenido).
  availableSlots: number
  contentId: string
  contentType: ContentType
}

export default function BulkPinUpload(props: Props) {
  const { contentType } = props

  const {
    derivedLabel,
    rows,
    defaultRatio,
    defaultLanguage,
    videoAutoplay,
    setVideoAutoplay,
    hasVideo,
    uploading,
    formError,
    okCount,
    errorCount,
    handleFilesChange,
    handleCsvChange,
    changeDefaultRatio,
    changeDefaultLanguage,
    removeRow,
    updateRow,
    handleUploadAll,
  } = useBulkPinUpload(props)

  return (
    <AdminFormBody>
      {derivedLabel && (
        <AdminMessage>
          El texto del feed es automático para{' '}
          {contentType === 'case'
            ? 'Case'
            : contentType === 'insight'
              ? 'Insight'
              : 'Episode'}
          . No se usa ninguna frase gancho del CSV ni del nombre del archivo.
        </AdminMessage>
      )}

      <AdminField label="Imágenes y vídeos (varios)" htmlFor="bulk-files">
        <AdminInput
          id="bulk-files"
          type="file"
          accept="image/*,video/*,.mov,.mp4,.webm"
          multiple
          disabled={uploading}
          onChange={(event) => handleFilesChange(event.target.files)}
        />
      </AdminField>

      <AdminField
        label={`Plantilla CSV (opcional): ${
          derivedLabel
            ? 'filename,ratio,language,alt'
            : 'filename,label,ratio,language,alt'
        }`}
        htmlFor="bulk-csv"
      >
        <AdminInput
          id="bulk-csv"
          type="file"
          accept=".csv,text/csv"
          disabled={uploading}
          onChange={(event) => handleCsvChange(event.target.files)}
        />
      </AdminField>

      <AdminFieldset
        legend="Campos comunes (se usan cuando el CSV no trae ese valor)"
        disabled={uploading}
      >
        <AdminField
          label="Ratio por defecto"
          htmlFor="bulk-default-ratio"
          help="Solo se usa si el CSV y el nombre del archivo no indican proporción (nombre esperado: nombre-1x1-tipo.jpg)."
        >
          <AdminSelect
            id="bulk-default-ratio"
            value={defaultRatio}
            onChange={(event) => changeDefaultRatio(event.target.value)}
          >
            <RatioOptions />
          </AdminSelect>
        </AdminField>

        <AdminField label="Idioma por defecto" htmlFor="bulk-default-language">
          <AdminSelect
            id="bulk-default-language"
            value={defaultLanguage}
            onChange={(event) => changeDefaultLanguage(event.target.value)}
          >
            <LocaleOptions display="value" />
          </AdminSelect>
        </AdminField>

        {/* Solo hace falta si el lote trae algún vídeo: las imágenes no se animan. */}
        {hasVideo && (
          <AdminField
            label="Reproducción de los vídeos en el feed"
            htmlFor="bulk-video-autoplay"
          >
            <AdminSelect
              id="bulk-video-autoplay"
              value={videoAutoplay}
              onChange={(event) =>
                setVideoAutoplay(event.target.value as 'viewport' | 'hover')
              }
            >
              <option value="viewport">Al entrar en pantalla</option>
              <option value="hover">Al pasar el ratón</option>
            </AdminSelect>
          </AdminField>
        )}
      </AdminFieldset>

      {rows.length > 0 && (
        <AdminTable>
          <thead>
            <tr>
              <th>Archivo</th>
              <th>{derivedLabel ? 'Texto del feed' : 'Frase gancho'}</th>
              <th>Ratio</th>
              <th>Idioma</th>
              <th>Alt</th>
              <th>Estado</th>
              <th>Quitar</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <BulkPinRow
                key={row.key}
                row={row}
                derivedLabel={derivedLabel}
                disabled={uploading}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => removeRow(row.key)}
              />
            ))}
          </tbody>
        </AdminTable>
      )}

      {formError && <AdminMessage kind="error">{formError}</AdminMessage>}

      {rows.length > 0 && (
        <div>
          <AdminButton
            type="button"
            variant="primary"
            disabled={uploading}
            onClick={handleUploadAll}
          >
            {uploading ? 'Subiendo lote…' : `Subir ${rows.length} pines`}
          </AdminButton>
        </div>
      )}

      {(okCount > 0 || errorCount > 0) && (
        <AdminMessage kind={errorCount > 0 ? 'warning' : 'success'}>
          {okCount} subidos correctamente
          {errorCount > 0 && `, ${errorCount} con error`}.
        </AdminMessage>
      )}
    </AdminFormBody>
  )
}
