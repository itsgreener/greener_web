import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

import type { CarouselOrder } from './useCarouselOrder'

/**
 * Aparece cuando hay un orden nuevo sin guardar: lo guarda o lo descarta.
 * Mientras tanto el resto de operaciones del carrusel están bloqueadas.
 */
export function CarouselOrderBar({
  order,
  disabled,
}: {
  order: CarouselOrder
  disabled: boolean
}) {
  return (
    <>
      <AdminMessage kind="notice">
        Has cambiado el orden y todavía no está guardado. Guarda o descarta el
        nuevo orden antes de editar, quitar o añadir diapositivas.
      </AdminMessage>

      <div>
        <AdminButton
          type="button"
          variant="primary"
          disabled={disabled}
          onClick={order.save}
        >
          Guardar orden
        </AdminButton>{' '}
        <AdminButton type="button" disabled={disabled} onClick={order.discard}>
          Descartar
        </AdminButton>
      </div>
    </>
  )
}
