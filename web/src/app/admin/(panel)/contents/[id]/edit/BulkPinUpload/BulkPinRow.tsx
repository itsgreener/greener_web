import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput, AdminSelect } from '@/components/admin/AdminControls'
import { LocaleOptions, RatioOptions } from '@/components/admin/AdminOptions'

import styles from './BulkPinRow.module.css'
import type { Row } from './rows'

export function BulkPinRow({
  row,
  derivedLabel,
  disabled,
  onChange,
  onRemove,
}: {
  row: Row
  derivedLabel: boolean
  disabled: boolean
  onChange: (patch: Partial<Row>) => void
  onRemove: () => void
}) {
  return (
    <tr>
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
