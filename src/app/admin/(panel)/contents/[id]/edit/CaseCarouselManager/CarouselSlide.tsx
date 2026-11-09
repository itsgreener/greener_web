import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminMediaItem } from '@/components/admin/AdminMediaItem'

import type { CarouselItem } from './types'

export function CarouselSlide({
  item,
  position,
  total,
  disabled,
  locked,
  active,
  onRemove,
  onEdit,
  onMoveBy,
  onMoveTo,
}: {
  item: CarouselItem
  /** Lugar en el orden que se está viendo (empieza en 1). */
  position: number
  total: number
  /** Hay una operación en marcha: no se puede tocar nada. */
  disabled: boolean
  /** Hay un orden sin guardar: solo se puede mover. */
  locked: boolean
  active: boolean
  onRemove: () => void
  onEdit: () => void
  onMoveBy: (delta: -1 | 1) => void
  onMoveTo: (position: number) => void
}) {
  // Se confirma al salir del campo o con Intro; un valor que no es un número
  // vuelve a la posición actual en vez de dejar un dato falso a la vista.
  function commitPosition(input: HTMLInputElement) {
    const next = Number(input.value)

    if (input.value.trim() === '' || !Number.isInteger(next)) {
      input.value = String(position)

      return
    }

    if (next !== position) onMoveTo(next)

    input.value = String(Math.min(Math.max(next, 1), total))
  }

  return (
    <AdminMediaItem
      image={
        item.kind === 'image'
          ? {
              publicId: item.cloudinaryPublicId,
              alt: item.alt,
            }
          : undefined
      }
      videoId={item.cloudinaryPublicId}
      caption={item.alt}
      disabled={disabled || locked}
      active={active}
      badge={`Diapositiva ${position} de ${total}`}
      onRemove={onRemove}
      actions={
        <>
          <AdminButton
            type="button"
            compact
            disabled={disabled || position === 1}
            aria-label={`Mover la diapositiva ${position} antes`}
            onClick={() => onMoveBy(-1)}
          >
            ←
          </AdminButton>

          <AdminButton
            type="button"
            compact
            disabled={disabled || position === total}
            aria-label={`Mover la diapositiva ${position} después`}
            onClick={() => onMoveBy(1)}
          >
            →
          </AdminButton>

          <AdminInput
            // Al cambiar de sitio, el campo vuelve a nacer con su posición.
            key={position}
            compact
            type="number"
            min={1}
            max={total}
            defaultValue={position}
            disabled={disabled}
            aria-label={`Posición de la diapositiva ${position}`}
            onBlur={(event) => commitPosition(event.currentTarget)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitPosition(event.currentTarget)
              }
            }}
          />

          <AdminButton
            type="button"
            compact
            disabled={disabled || locked}
            aria-label={`Editar la diapositiva ${position}`}
            onClick={onEdit}
          >
            Editar
          </AdminButton>
        </>
      }
    />
  )
}
