'use client'

import { useActionState, type FormEvent, type ReactNode } from 'react'

import {
  AdminButton,
  type AdminButtonVariant,
} from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

/**
 * Formulario de una sola acción del ABM: `<form action>` + campos ocultos +
 * confirmación opcional + botón con texto de «pendiente» + mensajes.
 *
 * Es el patrón que se repetía en una docena de sitios (reprocesar un CV,
 * borrar un contenido, publicar una versión…). Se ofrece en dos formas:
 *
 * - `AdminActionForm`: lleva su propio `useActionState`. Lo normal.
 * - `AdminActionFormView`: el mismo formulario, con el estado puesto desde
 *   fuera, para quien necesita leerlo en otro sitio (por ejemplo, decidir qué
 *   pintar a partir del resultado).
 *
 * Los textos de confirmación y de pendiente los pone quien lo usa y se
 * conservan tal cual: aquí no se reescribe ninguno.
 */

/** Forma mínima del estado de una acción: lo que este formulario sabe pintar. */
export type AdminActionState = {
  error?: string
  message?: string
  warning?: string
}

/**
 * `onSubmit` que pide confirmación y cancela el envío si el usuario dice que
 * no. Es el único sitio de los formularios del ABM donde se llama a
 * `window.confirm`.
 */
export function confirmSubmit(text: string) {
  return (event: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(text)) event.preventDefault()
  }
}

type FormProps = {
  /** Campos ocultos que viajan con el formulario (`id`, `contentId`…). */
  hidden?: Record<string, string>
  label: string
  /** Texto del botón mientras la acción está en marcha. */
  pendingLabel: string
  /** Si se pasa, se pide confirmación antes de enviar. */
  confirmText?: string
  variant?: AdminButtonVariant
  compact?: boolean
  /** Desactiva el botón además de mientras la acción está en marcha. */
  disabled?: boolean
  className?: string
  /** Mensajes por encima del botón en vez de por debajo. */
  messagesFirst?: boolean
  /** `false` si quien lo usa pinta los mensajes en otro sitio. */
  showMessages?: boolean
  /** Contenido extra entre el botón y los mensajes (una pista, por ejemplo). */
  children?: ReactNode
}

type ViewProps = FormProps & {
  /** El `dispatch` que devuelve `useActionState`. */
  action: (formData: FormData) => void
  pending: boolean
  state: AdminActionState
}

function Messages({ state }: { state: AdminActionState }) {
  return (
    <>
      {state.error && <AdminMessage kind="error">{state.error}</AdminMessage>}

      {state.warning && (
        <AdminMessage kind="warning">{state.warning}</AdminMessage>
      )}

      {state.message && (
        <AdminMessage kind="success">{state.message}</AdminMessage>
      )}
    </>
  )
}

export function AdminActionFormView({
  action,
  pending,
  state,
  hidden,
  label,
  pendingLabel,
  confirmText,
  variant,
  compact,
  disabled = false,
  className,
  messagesFirst = false,
  showMessages = true,
  children,
}: ViewProps) {
  return (
    <form
      action={action}
      className={className}
      onSubmit={confirmText ? confirmSubmit(confirmText) : undefined}
    >
      {hidden &&
        Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      {showMessages && messagesFirst && <Messages state={state} />}

      <AdminButton
        type="submit"
        variant={variant}
        compact={compact}
        disabled={pending || disabled}
      >
        {pending ? pendingLabel : label}
      </AdminButton>

      {children}

      {showMessages && !messagesFirst && <Messages state={state} />}
    </form>
  )
}

type Props = FormProps & {
  /**
   * Una Server Action `(previous, formData) => state`. Vale cualquiera cuyo
   * estado tenga solo `error`, `message` y `warning` (más lo que quiera, todo
   * opcional): es lo único que este formulario pinta.
   */
  action: (
    previous: AdminActionState,
    formData: FormData,
  ) => Promise<AdminActionState>
}

const INITIAL_STATE: AdminActionState = {}

export function AdminActionForm({ action, ...props }: Props) {
  const [state, dispatch, pending] = useActionState(action, INITIAL_STATE)

  return (
    <AdminActionFormView
      {...props}
      action={dispatch}
      pending={pending}
      state={state}
    />
  )
}
