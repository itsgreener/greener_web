const GENERIC_MESSAGE = 'No se ha podido crear el pin.'

/**
 * Postgres `invalid_parameter_value`. `create_pin` y `update_pin` lo usan
 * para rechazar datos del pin con un mensaje ya escrito para el equipo (p. ej.
 * «El rótulo del pin es obligatorio para este tipo de contenido»).
 */
const VALIDATION_ERROR_CODE = '22023'

/**
 * Mensaje que ve el equipo en el ABM cuando falla el alta de un pin.
 *
 * Antes toda excepción se convertía en «No se ha podido crear el pin.», con
 * lo que un rechazo de validación de la base de datos (que dice exactamente
 * qué falta) era indistinguible de una caída. Ahora los rechazos de
 * validación se muestran tal cual y el resto sigue siendo genérico: un error
 * de conexión, de permisos o un fallo inesperado no deben enseñar texto
 * interno de Postgres. El detalle completo de cualquier error sigue yendo al
 * log del servidor (console.error en la acción).
 */
export function pinCreationErrorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    (error as Error & { code?: string }).code === VALIDATION_ERROR_CODE &&
    error.message.trim() !== ''
  ) {
    return error.message
  }

  return GENERIC_MESSAGE
}
