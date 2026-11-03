import 'server-only'

import { contents } from '@/modules/content/container'
import type { Locale } from '@/modules/shared/domain/locale'

import { contentCapabilities } from './contentCapabilities'

/**
 * Idioma con el que se guarda un pin. En un contenido de un solo idioma
 * (episodio, insight, other) es siempre el del contenido, lo que mande el
 * formulario: el ABM ya no lo pregunta, pero esto es lo que lo garantiza
 * también ante un CSV con otra columna `language` o un pin antiguo con un
 * idioma distinto. En el resto (caso, tool) vale el que se pidió.
 *
 * Si no se puede leer el contenido, se respeta el pedido: un fallo de lectura
 * no debe impedir guardar un pin.
 */
export async function resolvePinLanguage(
  contentId: string,
  requested: Locale,
): Promise<Locale> {
  try {
    const content = await contents.getById(contentId)

    if (!content) return requested

    return contentCapabilities(content.type, null).pinLanguageFromContent
      ? content.defaultLocale
      : requested
  } catch (error) {
    console.error('Admin · resolvePinLanguage:', error)

    return requested
  }
}
