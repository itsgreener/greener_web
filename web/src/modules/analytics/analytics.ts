'use client'

import {
  init,
  track,
  type PlausibleRequestPayload,
} from '@plausible-analytics/tracker'

/**
 * Eventos definidos por arquitectura §18.2.
 *
 * Pin Click:
 * - destinationType: tipo de contenido al que lleva el pin.
 * - section: lugar desde el que se ha pulsado.
 * - tag: la arquitectura original lo contempla, pero el feed actual no
 *   transporta tags. Se mantiene opcional hasta que exista ese dato real.
 * - pinType: representación real actual del pin. El antiguo pin_type de
 *   base de datos ya no existe.
 */
export type AnalyticsEventMap = {
  'Pin Click': {
    destinationType: string
    section: string
    tag?: string
    pinType: 'image' | 'video' | 'carousel'
  }

  'Case Open': {
    caseId: string
    sourceSection: string
  }

  'Tool Open': {
    toolId: string
    action: string
  }

  'Tool Used': {
    toolId: string
    action: string
  }

  'Insight Open': {
    insightId: string
  }

  'Episode Play': {
    program: string
    episodeId: string
    provider: string
  }

  'Newsletter Signup': {
    placement: string
  }

  'Feed Depth': {
    section: string
    round: number
    batch: number
  }
}

type AnalyticsEventName = keyof AnalyticsEventMap

type QueuedEvent = {
  [K in AnalyticsEventName]: {
    name: K
    props: AnalyticsEventMap[K]
    interactive?: boolean
  }
}[AnalyticsEventName]

let configured = false
let initialized = false

/**
 * Los efectos de un componente hijo pueden intentar registrar un evento
 * antes de que AnalyticsProvider haya terminado de inicializar Plausible.
 */
let pendingEvents: QueuedEvent[] = []

const MAX_PENDING_EVENTS = 50

function stringifyProps(props: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(props)
      .filter(
        (
          entry,
        ): entry is [string, Exclude<(typeof entry)[1], null | undefined>] =>
          entry[1] !== null && entry[1] !== undefined,
      )
      .map(([key, value]) => [key, String(value)]),
  )
}

function shouldIgnorePage(payload: PlausibleRequestPayload): boolean {
  try {
    const url = new URL(payload.u)

    return url.pathname.startsWith('/admin') || url.pathname.startsWith('/auth')
  } catch {
    return false
  }
}

function sendEvent<K extends AnalyticsEventName>(
  name: K,
  props: AnalyticsEventMap[K],
  interactive?: boolean,
): void {
  track(name, {
    props: stringifyProps(props),

    ...(interactive !== undefined
      ? {
          interactive,
        }
      : {}),
  })
}

/**
 * Inicializa Plausible una sola vez.
 *
 * - Solo producción.
 * - Sin NEXT_PUBLIC_PLAUSIBLE_DOMAIN no hace nada.
 * - localhost tampoco se captura.
 * - /admin y /auth quedan excluidos.
 */
export function initAnalytics(domain: string | undefined): void {
  if (configured) {
    return
  }

  configured = true

  const normalizedDomain = domain?.trim()

  if (process.env.NODE_ENV !== 'production' || !normalizedDomain) {
    pendingEvents = []
    return
  }

  init({
    domain: normalizedDomain,
    autoCapturePageviews: true,
    captureOnLocalhost: false,
    logging: false,

    transformRequest(payload) {
      if (shouldIgnorePage(payload)) {
        return null
      }

      return payload
    },
  })

  initialized = true

  const queued = pendingEvents

  pendingEvents = []

  for (const event of queued) {
    sendEvent(event.name, event.props as never, event.interactive)
  }
}

/**
 * Punto único desde el que el resto de la aplicación envía eventos.
 */
export function trackAnalyticsEvent<K extends AnalyticsEventName>(
  name: K,
  props: AnalyticsEventMap[K],
  options?: {
    interactive?: boolean
  },
): void {
  if (initialized) {
    sendEvent(name, props, options?.interactive)

    return
  }

  if (!configured) {
    if (pendingEvents.length < MAX_PENDING_EVENTS) {
      pendingEvents.push({
        name,
        props,
        interactive: options?.interactive,
      } as QueuedEvent)
    }
  }
}
