import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { LocaleOptions, RatioOptions } from '@/components/admin/AdminOptions'

import styles from './BulkPinRow.module.css'
import type { Row } from './rows'

export function BulkPinRow({
  row,
  position,
  derivedLabel,
  showLanguage,
  disabled,
  onChange,
  onRemove,
}: {
  row: Row
  // Posición de la diapositiva en un carrusel de pines (§2.150); null fuera de
  // un carrusel. En un carrusel el ratio es único y no se edita por fila.
  position: number | null
  derivedLabel: boolean
  // false en un contenido de un solo idioma: el idioma no se pregunta.
  showLanguage: boolean
  disabled: boolean
  onChange: (patch: Partial<Row>) => void
  onRemove: () => void
}) {
  return (
    <tr>
      {position !== null && <td>{position}</td>}

      <td>{row.file.name}</td>

      <td>
        {derivedLabel ? (
          <span>Automático</span>
        ) : (
          <AdminInput
            compact
            aria-label={`Frase gancho de ${row.file.name}`}
            value={row.label}
            disabled={disabled}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        )}
      </td>

      {position === null && (
        <td>
          <AdminSelect
            compact
            aria-label={`Ratio de ${row.file.name}`}
            value={row.ratio}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ratio: event.target.value, ratioSource: 'manual' })
            }
          >
            <RatioOptions />
          </AdminSelect>
          {row.ratioSource === 'filename' && (
            <small className={styles.note}> detectado del nombre</small>
          )}
        </td>
      )}

      {showLanguage && (
        <td>
          <AdminSelect
            compact
            aria-label={`Idioma de ${row.file.name}`}
            value={row.language}
            disabled={disabled}
            onChange={(event) => onChange({ language: event.target.value })}
          >
            <LocaleOptions display="value" />
          </AdminSelect>
        </td>
      )}

      <td>
        <AdminInput
          compact
          aria-label={`Alt de ${row.file.name}`}
          value={row.alt}
          disabled={disabled}
          onChange={(event) => onChange({ alt: event.target.value })}
        />
      </td>

      <td>
        {row.status === 'pending' && 'Pendiente'}
        {row.status === 'uploading' && 'Subiendo…'}
        {row.status === 'ok' &&
          (row.note ? `Hecho. Aviso: ${row.note}` : 'Hecho')}
        {row.status === 'error' && `Error: ${row.error}`}
      </td>

      <td>
        {row.status !== 'ok' && row.status !== 'uploading' && (
          <AdminButton
            type="button"
            compact
            disabled={disabled}
            aria-label={`Quitar ${row.file.name} del lote`}
            onClick={onRemove}
          >
            Quitar
          </AdminButton>
        )}
      </td>
    </tr>
  )
}
