'use client'

import type { ContentType } from '@/modules/shared/domain/contentType'
import { localeLabel, type Locale } from '@/modules/shared/domain/locale'

import { AdminButton } from '@/components/admin/AdminButton'
import {
  AdminCheckbox,
  AdminInput,
  AdminSelect,
} from '@/components/admin/AdminControls'
import {
  AdminField,
  AdminFieldset,
  AdminHint,
} from '@/components/admin/AdminField'
import { AdminFormBody } from '@/components/admin/AdminForm'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { LocaleOptions, RatioOptions } from '@/components/admin/AdminOptions'
import { AdminTable } from '@/components/admin/AdminTable'

import { MAX_PINS_PER_CONTENT } from '@/modules/pin/domain/pinLimits'

import { BulkPinRow } from './BulkPinRow'
import { useBulkPinUpload, type BulkCarouselOption } from './useBulkPinUpload'

type Props = {
  // Huecos de pin que quedan en el contenido (máximo 8 por contenido).
  availableSlots: number
  contentId: string
  contentType: ContentType
  // Idioma que toman los pines si el contenido es de un solo idioma (episodio,
  // insight, other); null si cada pin elige el suyo (caso, tool).
  fixedLanguage: Locale | null
  // Solo en episodios (§2.150): opción «formar un carrusel con los pines».
  carousel?: BulkCarouselOption | null
}

/** Cabecera de la plantilla CSV según lo que se pregunta en este contenido. */
function csvColumns(
  derivedLabel: boolean,
  showLanguage: boolean,
  carouselActive: boolean,
) {
  return [
    'filename',
    derivedLabel ? null : 'label',
    // En un carrusel el ratio es único y se elige en el formulario.
    carouselActive ? null : 'ratio',
    showLanguage ? 'language' : null,
    'alt',
  ]
    .filter(Boolean)
    .join(',')
}

export default function BulkPinUpload(props: Props) {
  const { contentType, fixedLanguage, carousel, availableSlots } = props
  const showLanguage = fixedLanguage === null

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
    carouselActive,
    carouselChecked,
    changeCarousel,
    ignoredRatioCount,
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

      {fixedLanguage && (
        <AdminMessage>
          Los pines de este contenido toman su idioma:{' '}
          {localeLabel(fixedLanguage)}.
        </AdminMessage>
      )}

      {carousel && (
        <div>
          <AdminCheckbox
            label="Formar un carrusel con los pines"
            checked={carousel.enabled || carouselChecked}
            disabled={uploading || carousel.enabled || carousel.ratiosMixed}
            onChange={(event) => changeCarousel(event.target.checked)}
          />

          <AdminHint>
            {carousel.enabled
              ? 'Ya está activo: todos los pines de este episodio forman un único carrusel, en el orden de la lista. Se desactiva desde la casilla de la lista de pines.'
              : carousel.ratiosMixed
                ? 'Los pines actuales tienen ratios distintos. Unifica el ratio de todos antes de formar un carrusel.'
                : 'Todos los pines del episodio (los nuevos y los que ya hay) pasan a ser las diapositivas de una sola tarjeta del feed, en el orden de los nombres de archivo y con el mismo ratio. Pasa sola cada pocos segundos y se desliza con el dedo.'}
          </AdminHint>
        </div>
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
        label={`Plantilla CSV (opcional): ${csvColumns(derivedLabel, showLanguage, carouselActive)}`}
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
          label={carouselActive ? 'Ratio del carrusel' : 'Ratio por defecto'}
          htmlFor="bulk-default-ratio"
          help={
            carouselActive
              ? carousel?.lockedRatio
                ? 'Es el ratio de los pines que ya hay: todas las diapositivas lo comparten.'
                : 'Todas las diapositivas llevan este ratio; se ignora el del CSV y el del nombre del archivo.'
              : 'Solo se usa si el CSV y el nombre del archivo no indican proporción (nombre esperado: nombre-1x1-tipo.jpg).'
          }
        >
          <AdminSelect
            id="bulk-default-ratio"
            value={defaultRatio}
            disabled={carouselActive && !!carousel?.lockedRatio}
            onChange={(event) => changeDefaultRatio(event.target.value)}
          >
            <RatioOptions />
          </AdminSelect>
        </AdminField>

        {showLanguage && (
          <AdminField
            label="Idioma por defecto"
            htmlFor="bulk-default-language"
          >
            <AdminSelect
              id="bulk-default-language"
              value={defaultLanguage}
              onChange={(event) => changeDefaultLanguage(event.target.value)}
            >
              <LocaleOptions display="value" />
            </AdminSelect>
          </AdminField>
        )}

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

      {ignoredRatioCount > 0 && (
        <AdminMessage kind="warning">
          {ignoredRatioCount === 1
            ? 'Un archivo traía un ratio distinto'
            : `${ignoredRatioCount} archivos traían un ratio distinto`}{' '}
          (en el CSV o en el nombre): se ha ignorado, porque todas las
          diapositivas de un carrusel comparten el mismo.
        </AdminMessage>
      )}

      {rows.length > 0 && (
        <AdminTable>
          <thead>
            <tr>
              {carouselActive && <th>#</th>}
              <th>Archivo</th>
              <th>{derivedLabel ? 'Texto del feed' : 'Frase gancho'}</th>
              {!carouselActive && <th>Ratio</th>}
              {showLanguage && <th>Idioma</th>}
              <th>Alt</th>
              <th>Estado</th>
              <th>Quitar</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <BulkPinRow
                key={row.key}
                row={row}
                // Posición de la diapositiva: tras los pines que ya hay.
                position={
                  carouselActive
                    ? MAX_PINS_PER_CONTENT - availableSlots + index + 1
                    : null
                }
                derivedLabel={derivedLabel}
                showLanguage={showLanguage}
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
