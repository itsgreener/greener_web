import { isDomainError } from '@/modules/shared/domain/domainError'
import { PIN_LABEL_REQUIRED_MESSAGE } from '@/modules/pin/domain/pinMessages'

const GENERIC_MESSAGE = 'No se ha podido crear el pin.'

/**
 * Mensaje que ve el equipo en el ABM cuando falla el alta de un pin.
 *
 * Antes toda excepción se convertía en «No se ha podido crear el pin.», con
 * lo que un rechazo de validación de la base de datos (que dice exactamente
 * qué falta) era indistinguible de una caída. Ahora los rechazos de
 * validación (`validation_rejected`, con un mensaje ya escrito para el
 * equipo) y el rótulo obligatorio se muestran tal cual y el resto sigue
 * siendo genérico: un error de conexión, de permisos o un fallo inesperado
 * no deben enseñar texto interno de Postgres. El detalle completo de
 * cualquier error sigue yendo al log del servidor (console.error en la
 * acción).
 */
export function pinCreationErrorMessage(error: unknown): string {
  if (isDomainError(error, 'pin_label_required')) {
    return PIN_LABEL_REQUIRED_MESSAGE
  }

  if (isDomainError(error, 'validation_rejected') && error.message.trim()) {
    return error.message
  }

  return GENERIC_MESSAGE
}
