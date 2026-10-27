'use client'

import { useState } from 'react'

import type { PinListItem } from '@/modules/pin/domain/pinRepository'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

import {
  deleteAllPinsAction,
  deletePinAction,
} from '@/app/admin/(panel)/contents/[id]/edit/pinActions'
import { useEditorOperation } from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'

type PinDeleteResult = { formError?: string; warning?: string }

/**
 * Botón destructivo con confirmación: pide el cerrojo del editor, ejecuta la
 * Server Action y refresca la página. Un aviso (archivos que no se han podido
 * borrar de Cloudinary) se enseña en el mismo sitio que un error y no refresca.
 */
function DeleteButton({
  confirmMessage,
  idleLabel,
  action,
  compact = false,
}: {
  confirmMessage: string
  idleLabel: string
  action: () => Promise<PinDeleteResult>
  compact?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const { run, pending, busy } = useEditorOperation({
    setError,
    setWarning: setError,
  })

  async function handleClick() {
    if (!window.confirm(confirmMessage)) {
      return
    }

    await run(action, (result) => ({
      error: result.formError ?? result.warning,
    }))
  }

  return (
    <div>
      <AdminButton
        type="button"
        variant="danger"
        compact={compact}
        onClick={handleClick}
        disabled={pending || busy}
      >
        {pending ? 'Borrando…' : idleLabel}
      </AdminButton>

      {error && <AdminMessage kind="error">{error}</AdminMessage>}
    </div>
  )
}

export function DeletePinButton({
  pin,
  contentId,
}: {
  pin: PinListItem
  contentId: string
}) {
  return (
    <DeleteButton
      confirmMessage={`¿Borrar el pin "${pin.label ?? pin.id}"? Esta acción no se puede deshacer.`}
      idleLabel="Borrar pin"
      compact
      action={() => deletePinAction(pin.id, contentId)}
    />
  )
}

export function DeleteAllPinsButton({
  contentId,
  count,
}: {
  contentId: string
  count: number
}) {
  return (
    <DeleteButton
      confirmMessage={`¿Borrar los ${count} pines de este contenido? Se borrarán también sus archivos y el contenido dejará de aparecer en el feed hasta que subas pines nuevos. Esta acción no se puede deshacer.`}
      idleLabel={`Borrar todos los pines (${count})`}
      action={() => deleteAllPinsAction(contentId)}
    />
  )
}
