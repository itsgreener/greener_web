'use client'

import { useState, type ChangeEvent } from 'react'

/**
 * Los formularios del ABM (TranslationForm, CaseDetailForm...) usan
 * inputs no controlados (`defaultValue` + `FormData` en el submit) para
 * no complicar el guardado. Este hook no los convierte en controlados:
 * solo escucha `onChange` para reflejar la longitud en vivo en
 * <CharCounter>, el valor real del campo lo sigue llevando el DOM.
 */
export function useCharCount(initialValue: string) {
  const [length, setLength] = useState(initialValue.length)

  function onChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setLength(event.target.value.length)
  }

  return { length, onChange }
}
