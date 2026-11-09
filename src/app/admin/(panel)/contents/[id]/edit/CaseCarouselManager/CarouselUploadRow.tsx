import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'

import type { SlideRow } from './rows'

function StatusText({ row }: { row: SlideRow }) {
  if (row.status === 'uploading') return 'Subiendo…'
  if (row.status === 'ok') return 'Hecho'
  if (row.status === 'error') return `Error: ${row.error}`

  return row.alt.trim() ? 'Pendiente' : 'Falta el alt'
}

export function CarouselUploadRow({
  row,
  position,
  disabled,
  onAltChange,
  onRemove,
}: {
  row: SlideRow
  // Lugar que ocupará entre las diapositivas nuevas (empieza en 1).
  position: number
  disabled: boolean
  onAltChange: (alt: string) => void
  onRemove: () => void
}) {
  return (
    <tr>
      <td>{position}</td>

      <td>{row.file.name}</td>

      <td>
        <AdminInput
          compact
          aria-label={`Alt de ${row.file.name}`}
          value={row.alt}
          disabled={disabled || row.status === 'ok'}
          onChange={(event) => onAltChange(event.target.value)}
        />
      </td>

      <td>
        <StatusText row={row} />
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
