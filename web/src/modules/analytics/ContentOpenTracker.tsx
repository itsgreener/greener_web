'use client'

import { useEffect, useRef } from 'react'

import { trackAnalyticsEvent } from './analytics'
import { consumeNavigationSource } from './navigationAttribution'

type Props =
  { type: 'case'; contentId: string } | { type: 'tool'; contentId: string }

/**
 * Registra una apertura pública real de contenido (arquitectura §18.2:
 * "Case Open" / "Tool Open") — se monta dentro de la
 * página de detalle correspondiente, no en el pin que enlaza a ella, para
 * que solo cuente una carga real de la página de destino.
 *
 * Un preview firmado (`?preview=<token>`, §15.3) no es una apertura
 * pública y queda excluido explícitamente, aunque `resolvePreviewContext`
 * también lo excluiría de RLS — esto es solo sobre no contaminar métricas.
 *
 * Se dispara como máximo una vez por montaje (`tracked`), no en cada
 * re-render.
 *
 * «Insight Open» NO sale de aquí: un insight no tiene ficha React (su URL
 * pública es el propio paquete, `/insights/{slug}/app`), así que lo registra
 * el servidor al cargar ese documento (script del paquete +
 * `POST /api/analytics/package`, contrato del ZIP §6.7).
 */
export function ContentOpenTracker(props: Props) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) {
      return
    }

    if (new URLSearchParams(window.location.search).has('preview')) {
      return
    }

    tracked.current = true

    const sourceSection = consumeNavigationSource()

    switch (props.type) {
      case 'case':
        trackAnalyticsEvent('Case Open', {
          caseId: props.contentId,
          sourceSection,
        })
        break

      case 'tool':
        trackAnalyticsEvent('Tool Open', {
          toolId: props.contentId,
          action: 'open',
        })
        break
    }
  }, [props.type, props.contentId])

  return null
}
