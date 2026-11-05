'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { HOVER_INTENT_MS } from '@/modules/media/domain/videoPlayback'

/**
 * Hover con intención: el puntero cuenta como «encima» solo tras
 * `HOVER_INTENT_MS` sin salir; el foco de teclado cuenta al instante. Al
 * salir (o desenfocar) se apaga de inmediato y se cancela cualquier espera
 * pendiente, así que cruzar el pin de pasada no dispara nada.
 */
export function useHoverIntent(delayMs: number = HOVER_INTENT_MS) {
  const [pointerIntent, setPointerIntent] = useState(false)
  const [focused, setFocused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onMouseEnter = useCallback(() => {
    clear()
    timer.current = setTimeout(() => {
      timer.current = null
      setPointerIntent(true)
    }, delayMs)
  }, [clear, delayMs])

  const onMouseLeave = useCallback(() => {
    clear()
    setPointerIntent(false)
  }, [clear])

  const onFocus = useCallback(() => setFocused(true), [])
  const onBlur = useCallback(() => setFocused(false), [])

  // Un temporizador vivo no debe sobrevivir al desmontaje.
  useEffect(() => clear, [clear])

  return {
    active: pointerIntent || focused,
    handlers: { onMouseEnter, onMouseLeave, onFocus, onBlur },
  }
}
