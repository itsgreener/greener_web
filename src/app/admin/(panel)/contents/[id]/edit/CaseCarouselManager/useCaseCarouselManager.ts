'use client'

import { useState } from 'react'

import {
  removeAllCaseCarouselMediaAction,
  removeCaseCarouselMediaAction,
} from '@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions'
import { useEditorOperation } from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'

import type { CarouselItem, CaseCarouselManagerProps } from './types'
import { useCarouselBulkUpload } from './useCarouselBulkUpload'
import { useCarouselOrder } from './useCarouselOrder'
import { useCarouselSlideEditor } from './useCarouselSlideEditor'

export function useCaseCarouselManager({
  contentId,
  items,
}: CaseCarouselManagerProps) {
  const [removingAll, setRemovingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const saved = [...items].sort((a, b) => a.sortOrder - b.sortOrder)

  const operation = useEditorOperation({ setError, setWarning })
  const upload = useCarouselBulkUpload({ contentId, items })
  const order = useCarouselOrder({ contentId, sorted: saved, operation })
  const editor = useCarouselSlideEditor({
    contentId,
    sorted: saved,
    operation,
    feedback: { setError, setWarning },
  })

  // Lo que se ve es el orden en curso (el borrador, si lo hay).
  const sorted = order.ordered

  // Con un orden sin guardar, editar, quitar o añadir dejaría el borrador
  // apuntando a un carrusel que ya no es el que se ve: primero se guarda o
  // se descarta.
  const locked = order.dirty

  function handleRemove(item: CarouselItem) {
    return operation.run(
      () =>
        removeCaseCarouselMediaAction({
          contentId,
          mediaId: item.mediaId,
          cloudinaryPublicId: item.cloudinaryPublicId,
          kind: item.kind,
        }),
      (result) =>
        result.ok ? { warning: result.warning } : { error: result.error },
    )
  }

  async function handleRemoveAll() {
    if (
      !window.confirm(
        `¿Quitar las ${sorted.length} diapositivas del carrusel? Se borrarán también sus archivos. Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }

    setRemovingAll(true)

    await operation.run(
      () => removeAllCaseCarouselMediaAction(contentId),
      // Con aviso no se refresca, para que el admin pueda leerlo.
      (result) =>
        result.ok
          ? { warning: result.warning, keepWarningVisible: true }
          : { error: result.error },
    )

    setRemovingAll(false)
  }

  return {
    sorted,
    upload,
    order,
    editor,
    locked,
    removingAll,
    busy: operation.busy,
    error,
    warning,
    handleRemove,
    handleRemoveAll,
  }
}
