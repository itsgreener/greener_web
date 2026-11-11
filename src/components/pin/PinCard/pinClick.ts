import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import { rememberNavigationSource } from '@/modules/analytics/navigationAttribution'

import type { PinAnalyticsContext, PinMediaData } from './types'

/**
 * `pinType` del evento "Pin Click" (§18.2) — ya no existe un `pin_type`
 * de base de datos del que leerlo directamente, se deriva del medio que se
 * está viendo (en un carrusel, el de la diapositiva activa).
 */
function analyticsPinType(media: PinMediaData | undefined): 'image' | 'video' {
  return media?.kind === 'video' ? 'video' : 'image'
}

/**
 * Registra el clic en un pin: la atribución de la ficha de destino
 * ("Case Open") y el evento "Pin Click". Sin contexto de analítica no hace
 * nada. Solo memoria de la pestaña; no se escribe nada en el navegador.
 */
export function trackPinClick(
  destination: string,
  analyticsContext: PinAnalyticsContext | undefined,
  visibleMedia: PinMediaData | undefined,
): void {
  if (!analyticsContext) return

  rememberNavigationSource(destination, analyticsContext.section)

  trackAnalyticsEvent(
    'Pin Click',
    {
      destinationType: analyticsContext.destinationType,
      section: analyticsContext.section,
      ...(analyticsContext.tag ? { tag: analyticsContext.tag } : {}),
      pinType: analyticsPinType(visibleMedia),
    },
    { interactive: true },
  )
}
