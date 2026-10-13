import { LANGUAGES, RATIOS, type Row } from './rows'

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
          <input
            value={row.label}
            disabled={disabled}
            onChange={(event) => onChange({ label: event.target.value })}
          />
        )}
      </td>

      <td>
        <select
          value={row.ratio}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ratio: event.target.value, ratioSource: 'manual' })
          }
        >
          {RATIOS.map((ratio) => (
            <option key={ratio} value={ratio}>
              {ratio}
            </option>
          ))}
        </select>
        {row.ratioSource === 'filename' && <small> detectado del nombre</small>}
      </td>

      <td>
        <select
          value={row.language}
          disabled={disabled}
          onChange={(event) => onChange({ language: event.target.value })}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {language}
            </option>
          ))}
        </select>
      </td>

      <td>
        <input
          value={row.alt}
          disabled={disabled}
          onChange={(event) => onChange({ alt: event.target.value })}
        />
      </td>

      <td>
        {row.status === 'pending' && 'Pendiente'}
        {row.status === 'uploading' && 'Subiendo...'}
        {row.status === 'ok' &&
          (row.note ? `Hecho. Aviso: ${row.note}` : 'Hecho')}
        {row.status === 'error' && `Error: ${row.error}`}
      </td>

      <td>
        {row.status !== 'ok' && row.status !== 'uploading' && (
          <button
            type="button"
            disabled={disabled}
            aria-label={`Quitar ${row.file.name} del lote`}
            onClick={onRemove}
          >
            Quitar
          </button>
        )}
      </td>
    </tr>
  )
}
