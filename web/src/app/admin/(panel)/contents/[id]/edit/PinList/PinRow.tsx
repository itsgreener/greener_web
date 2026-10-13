import type { PinListItem } from '@/modules/pin/domain/pinRepository'

import { DeletePinButton } from './DeletePinButtons'

export function PinRow({
  pin,
  contentId,
  derivedLabel,
  expanded,
  onToggle,
}: {
  pin: PinListItem
  contentId: string
  derivedLabel: boolean
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <tr>
      <td>
        {derivedLabel
          ? 'Automático: título + cliente / tipo de episodio / «Insights by Greener»'
          : (pin.label ?? '—')}
      </td>
      <td>{pin.ratio}</td>
      <td>
        {pin.media === null
          ? 'Sin medio'
          : pin.media.kind === 'video'
            ? 'Vídeo'
            : 'Imagen'}
      </td>
      <td>
        <button type="button" onClick={onToggle}>
          {expanded ? 'Cerrar' : 'Editar'}
        </button>

        <DeletePinButton pin={pin} contentId={contentId} />
      </td>
    </tr>
  )
}
