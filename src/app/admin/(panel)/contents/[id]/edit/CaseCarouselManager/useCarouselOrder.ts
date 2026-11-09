'use client'

import { useState } from 'react'

import { reorderCaseCarouselAction } from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'
import type { useEditorOperation } from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'
import {
  isSameOrder,
  moveCarouselItem,
  reconcileOrder,
} from '@/modules/content/domain/caseCarouselOrder'

import type { CarouselItem } from './types'

/**
 * Reordenar las diapositivas de un caso. El orden se prepara en local (un
 * borrador que no toca la base de datos) y se guarda de una vez con «Guardar
 * orden»: una sola operación atómica con la lista completa, en vez de un
 * guardado por cada clic en una flecha. Mientras hay un borrador sin guardar,
 * el gestor bloquea el resto de operaciones del carrusel.
 */
export function useCarouselOrder({
  contentId,
  sorted,
  operation,
}: {
  contentId: string
  /** Diapositivas en su orden guardado. */
  sorted: CarouselItem[]
  operation: ReturnType<typeof useEditorOperation>
}) {
  const [draft, setDraft] = useState<string[] | null>(null)

  const savedIds = sorted.map((item) => item.mediaId)
  const orderedIds = reconcileOrder(draft, savedIds)
  const dirty = !isSameOrder(orderedIds, savedIds)

  // Tras guardar y refrescar, el orden guardado ya es el del borrador: se
  // suelta, para que un cambio posterior (otra pestaña) no lo reviva.
  if (draft !== null && !dirty) setDraft(null)

  const byId = new Map(sorted.map((item) => [item.mediaId, item]))
  const ordered = orderedIds.flatMap((id) => byId.get(id) ?? [])

  function moveTo(mediaId: string, position: number) {
    const from = orderedIds.indexOf(mediaId)

    if (from === -1 || !Number.isInteger(position)) return

    setDraft(moveCarouselItem(orderedIds, from, position - 1))
  }

  function moveBy(mediaId: string, delta: -1 | 1) {
    const from = orderedIds.indexOf(mediaId)

    if (from === -1) return

    setDraft(moveCarouselItem(orderedIds, from, from + delta))
  }

  function discard() {
    setDraft(null)
  }

  function save() {
    return operation.run(
      () => reorderCaseCarouselAction({ contentId, mediaIds: orderedIds }),
      (result) => (result.ok ? {} : { error: result.error }),
    )
  }

  return { ordered, dirty, moveTo, moveBy, discard, save }
}

export type CarouselOrder = ReturnType<typeof useCarouselOrder>
