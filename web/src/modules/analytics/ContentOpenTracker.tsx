'use client'

import {
  useEffect,
  useRef,
} from 'react'

import {
  trackAnalyticsEvent,
} from './analytics'

import {
  consumeNavigationSource,
} from './navigationAttribution'

type Props =
  | {
      type: 'case'
      contentId: string
    }
  | {
      type: 'tool'
      contentId: string
    }
  | {
      type: 'insight'
      contentId: string
    }

/**
 * Registra una apertura real de contenido.
 *
 * Los previews firmados no cuentan como aperturas públicas y por eso
 * cualquier URL con ?preview= queda excluida.
 */
export function ContentOpenTracker(
  props: Props,
) {
  const tracked =
    useRef(false)

  useEffect(() => {
    if (
      tracked.current
    ) {
      return
    }

    if (
      new URLSearchParams(
        window.location.search,
      ).has('preview')
    ) {
      return
    }

    tracked.current =
      true

    const sourceSection =
      consumeNavigationSource()

    switch (
      props.type
    ) {
      case 'case':
        trackAnalyticsEvent(
          'Case Open',
          {
            caseId:
              props.contentId,

            sourceSection,
          },
        )

        break

      case 'tool':
        trackAnalyticsEvent(
          'Tool Open',
          {
            toolId:
              props.contentId,

            action:
              'open',
          },
        )

        break

      case 'insight':
        trackAnalyticsEvent(
          'Insight Open',
          {
            insightId:
              props.contentId,
          },
        )

        break
    }
  }, [
    props.type,
    props.contentId,
  ])

  return null
}