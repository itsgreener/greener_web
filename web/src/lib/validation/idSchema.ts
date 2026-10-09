import { z } from 'zod'

const ENTITY_LABEL = {
  content: 'del contenido',
  pin: 'del pin',
  media: 'del medio',
  version: 'de la versión',
} as const

export type IdEntity = keyof typeof ENTITY_LABEL

/**
 * Identificador (uuid) de una entidad, con el mensaje de error de siempre:
 * «El identificador del contenido no es válido». Sustituye a la copia de
 * `z.string().uuid('…')` que había en cada schema.
 */
export function idSchema(entity: IdEntity) {
  return z.uuid(`El identificador ${ENTITY_LABEL[entity]} no es válido`)
}
