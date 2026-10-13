'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { acquireEditorLock, useEditorBusy } from './editorLock'

/**
 * Vuelve a pedir al servidor los datos de la página (router.refresh) sin
 * recargarla: conserva el scroll y el estado de los formularios. Mientras
 * llegan los datos nuevos, mantiene tomado el cerrojo del editor
 * (editorLock.ts): antes la recarga completa lo reiniciaba sola; ahora la
 * página sigue viva y hay que soltarlo cuando termina el refresco.
 */
export function useEditorRefresh() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const releaseRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!isPending && releaseRef.current) {
      releaseRef.current()
      releaseRef.current = null
    }
  }, [isPending])

  // Si el componente se desmonta a mitad de refresco, no deja el cerrojo tomado.
  useEffect(
    () => () => {
      releaseRef.current?.()
      releaseRef.current = null
    },
    [],
  )

  return useCallback(() => {
    releaseRef.current ??= acquireEditorLock()

    startTransition(() => {
      router.refresh()
    })
  }, [router])
}

export interface OperationOutcome {
  /** El servidor rechazó la operación: se muestra y no se refresca. */
  error?: string | null
  /** Aviso no bloqueante (p. ej. un archivo que no se pudo borrar). */
  warning?: string | null
  /** Con aviso, no refrescar para que el admin pueda leerlo. */
  keepWarningVisible?: boolean
}

/** Dónde se muestran el error y el aviso de la operación (los pone el formulario). */
export interface OperationFeedback {
  setError: (message: string | null) => void
  setWarning: (message: string | null) => void
}

/**
 * Operación destructiva del editor (borrar un pin, quitar una diapositiva…):
 * toma el cerrojo compartido, ejecuta la Server Action, traduce su resultado
 * y, si ha ido bien, refresca la página. Mensajes y reglas idénticos para
 * todas las operaciones del editor.
 */
export function useEditorOperation({
  setError,
  setWarning,
}: OperationFeedback) {
  const refresh = useEditorRefresh()
  const busy = useEditorBusy()
  const [pending, setPending] = useState(false)

  const run = useCallback(
    async <Result>(
      action: () => Promise<Result>,
      interpret: (result: Result) => OperationOutcome,
    ) => {
      const release = acquireEditorLock()

      setPending(true)
      setError(null)
      setWarning(null)

      let result: Result

      try {
        result = await action()
      } catch (actionError) {
        console.error(actionError)
        setError('No se ha podido completar la operación.')
        setPending(false)
        release()

        return
      }

      const outcome = interpret(result)

      if (outcome.error) {
        setError(outcome.error)
        setPending(false)
        release()

        return
      }

      if (outcome.warning) {
        setWarning(outcome.warning)

        if (outcome.keepWarningVisible) {
          setPending(false)
          release()

          return
        }
      }

      refresh()
      setPending(false)
      release()
    },
    [refresh, setError, setWarning],
  )

  return { run, pending, busy }
}
