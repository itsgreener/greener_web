'use client'

import { AdminInput, AdminTextarea } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { CharCounter } from '@/components/admin/CharCounter'
import { useCharCount } from '@/components/admin/useCharCount'

type Props = {
  /** `id` del control (y `for` de la etiqueta). */
  id: string
  name: string
  label: React.ReactNode
  /** Límite blando de caracteres (`TEXT_LIMITS`): el contador avisa, no bloquea. */
  max: number
  defaultValue?: string
  /** Una línea (`input`, por defecto) o varias (`textarea`). */
  kind?: 'input' | 'textarea'
  /** Solo para `textarea`. */
  rows?: number
  required?: boolean
  help?: React.ReactNode
  /** Primer mensaje de error del campo. */
  error?: string
}

/**
 * Campo de texto con contador de caracteres: etiqueta, control no controlado
 * (`defaultValue` + `FormData`, como el resto del ABM), contador en vivo a la
 * derecha de la etiqueta, ayuda y error. Encapsula `useCharCount`, así que
 * cada campo lleva su propio contador sin que el formulario tenga que
 * declararlo.
 */
export function AdminCountedField({
  id,
  name,
  label,
  max,
  defaultValue = '',
  kind = 'input',
  rows,
  required,
  help,
  error,
}: Props) {
  const count = useCharCount(defaultValue)

  return (
    <AdminField
      label={label}
      htmlFor={id}
      aside={<CharCounter length={count.length} max={max} />}
      help={help}
      error={error}
    >
      {kind === 'textarea' ? (
        <AdminTextarea
          id={id}
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          onChange={count.onChange}
          required={required}
        />
      ) : (
        <AdminInput
          id={id}
          name={name}
          type="text"
          defaultValue={defaultValue}
          onChange={count.onChange}
          required={required}
        />
      )}
    </AdminField>
  )
}
