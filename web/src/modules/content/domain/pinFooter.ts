import type { ContentType } from '@/modules/shared/domain/contentType'

import { episodePinSecondaryText } from './episodeLabels'

/**
 * Texto en negrita bajo el título en el pin de un insight. Ocupa el lugar que en un caso ocupa el cliente,
 * pero es FIJO: el mismo para todos los insights, sin campo en el ABM.
 * El texto está en inglés porque la interfaz global lo está (§2.4).
 */
export const INSIGHT_PIN_SECONDARY_TEXT = 'Insights by Greener'

/** Lo que hace falta saber de un pin para su pie en el feed. */
export interface PinFooterPin {
  label: string | null
  language: string
}

/** Lo que hace falta saber de su contenido para el pie del pin. */
export interface PinFooterContent {
  type: ContentType
  defaultLocale?: string
  translations: { locale: string; title: string }[]
  /** Solo caso. */
  caseClient?: string | null
  /** Solo episodio. */
  episodeProgram?: string | null
  episodeKind?: string | null
}

export interface PinFooterText {
  label: string | null
  displayTitle: string | null
  displaySecondary: string | null
}

function resolveContentTitle(
  content: PinFooterContent,
  pinLanguage: string,
): string | null {
  const { translations } = content

  return (
    translations.find((translation) => translation.locale === pinLanguage)
      ?.title ??
    translations.find(
      (translation) => translation.locale === content.defaultLocale,
    )?.title ??
    translations[0]?.title ??
    null
  )
}

/**
 * Textos del pie de un pin en el feed. Other sigue usando el rótulo escrito
 * por el admin; case/episode/insight derivan sus líneas del propio contenido
 * y tool reutiliza el rótulo del pin como descripción superior con el nombre
 * de la herramienta como segunda línea.
 */
export function derivedFeedText(
  pin: PinFooterPin,
  content: PinFooterContent,
): PinFooterText {
  switch (content.type) {
    case 'case':
      return {
        // Importante: cualquier label antigua guardada por el ABM queda
        // deliberadamente ignorada para case.
        label: null,
        displayTitle: resolveContentTitle(content, pin.language),
        displaySecondary: content.caseClient?.trim() || null,
      }

    case 'tool':
      return {
        // Para Tool mantenemos el texto específico de cada pin que ya
        // existe en `pin.label`, pero deja de renderizarse como rótulo de
        // una sola línea: pasa a ser la descripción superior. La segunda
        // línea es el nombre de la herramienta, obtenido automáticamente
        // del contenido. Así una Tool puede tener muchos pines con
        // descripciones distintas sin duplicar el contenido ni repetir
        // manualmente su nombre.
        label: null,
        displayTitle: pin.label?.trim() || null,
        displaySecondary: resolveContentTitle(content, pin.language),
      }

    case 'insight':
      return {
        // La frase gancho (pin.label) no se muestra en insights: el título
        // basta y no se repite texto debajo.
        label: null,
        displayTitle: resolveContentTitle(content, pin.language),
        displaySecondary: INSIGHT_PIN_SECONDARY_TEXT,
      }

    case 'episode':
      return {
        // Mismo criterio para episode: el admin no decide el rótulo del feed.
        label: null,
        displayTitle: resolveContentTitle(content, pin.language),
        // En el formato B final, episode sustituye `client` por el programa
        // + el tipo: «Brand the Future Podcast». El programa
        // es el campo «Programa» del ABM; el tipo, «Tipo de episodio».
        displaySecondary: episodePinSecondaryText(
          content.episodeProgram,
          content.episodeKind,
        ),
      }

    case 'other':
      return {
        label: pin.label,
        displayTitle: null,
        displaySecondary: null,
      }
  }
}
