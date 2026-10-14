'use client'

import type { ContentType } from '@/modules/shared/domain/contentType'

import { BulkPinRow } from './BulkPinRow'
import { LANGUAGES, RATIOS } from './rows'
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
    <div>
      {derivedLabel && (
        <p>
          El texto del feed es automático para{' '}
          {contentType === 'case'
            ? 'Case'
            : contentType === 'insight'
              ? 'Insight'
              : 'Episode'}
          . No se usa ninguna frase gancho del CSV ni del nombre del archivo.
        </p>
      )}

      <label htmlFor="bulk-files">Imágenes y vídeos (varios)</label>
      <input
        id="bulk-files"
        type="file"
        accept="image/*,video/*,.mov,.mp4,.webm"
        multiple
        disabled={uploading}
        onChange={(event) => handleFilesChange(event.target.files)}
      />

      <label htmlFor="bulk-csv">
        Plantilla CSV (opcional):{' '}
        {derivedLabel
          ? 'filename,ratio,language,alt'
          : 'filename,label,ratio,language,alt'}
      </label>
      <input
        id="bulk-csv"
        type="file"
        accept=".csv,text/csv"
        disabled={uploading}
        onChange={(event) => handleCsvChange(event.target.files)}
      />

      <fieldset disabled={uploading}>
        <legend>
          Campos comunes (se usan cuando el CSV no trae ese valor)
        </legend>

        <label htmlFor="bulk-default-ratio">Ratio por defecto</label>
        <select
          id="bulk-default-ratio"
          value={defaultRatio}
          onChange={(event) => changeDefaultRatio(event.target.value)}
        >
          {RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
        <small>
          Solo se usa si el CSV y el nombre del archivo no indican proporción
          (nombre esperado: nombre-1x1-tipo.jpg).
        </small>

        <label htmlFor="bulk-default-language">Idioma por defecto</label>
        <select
          id="bulk-default-language"
          value={defaultLanguage}
          onChange={(event) => changeDefaultLanguage(event.target.value)}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>

        {/* Solo hace falta si el lote trae algún vídeo: las imágenes no se animan. */}
        {hasVideo && (
          <>
            <label htmlFor="bulk-video-autoplay">
              Reproducción de los vídeos en el feed
            </label>
            <select
              id="bulk-video-autoplay"
              value={videoAutoplay}
              onChange={(event) =>
                setVideoAutoplay(event.target.value as 'viewport' | 'hover')
              }
            >
              <option value="viewport">Al entrar en pantalla</option>
              <option value="hover">Al pasar el ratón</option>
            </select>
          </>
        )}
      </fieldset>

      {rows.length > 0 && (
        <table>
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
        </table>
      )}

      {formError && <p>{formError}</p>}

      {rows.length > 0 && (
        <button type="button" disabled={uploading} onClick={handleUploadAll}>
          {uploading ? 'Subiendo lote...' : `Subir ${rows.length} pines`}
        </button>
      )}

      {(okCount > 0 || errorCount > 0) && (
        <p>
          {okCount} subidos correctamente
          {errorCount > 0 && `, ${errorCount} con error`}.
        </p>
      )}
    </div>
  )
}
