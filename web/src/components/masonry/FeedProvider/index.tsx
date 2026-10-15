'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { FeedPinItem } from '@/modules/feed/domain/feedReadModels'
import { pageLoadId } from '@/components/masonry/pageLoadId'

/**
 * Arquitectura §6.2: "La opción principal es mantener el estado del feed
 * en el layout cliente durante la navegación interna. Como respaldo, se
 * serializan en sessionStorage únicamente metadatos de batches, cursor y
 * scroll, vinculados al pageLoadId actual."
 *
 * Vive en (public)/layout.tsx, que Next.js NO desmonta al navegar entre
 * la home/subhomes y un detalle y volver (solo desmonta page.tsx) — por
 * eso basta con que el estado viva aquí para que sobreviva a esa
 * navegación sin volver a pedir nada al servidor. sessionStorage es el
 * respaldo, por si el propio layout llegara a desmontarse sin que haya
 * habido una recarga real del documento.
 *
 * El estado es por scope (home/work/insights/tools/channel): cada subhome
 * tiene su propio universo de pines, sesión y scroll.
 *
 * La posición de scroll NO es estado de React: vive en un ref, para que
 * scrollear no re-renderice el feed ni recree `loadMore` (y su
 * IntersectionObserver). El respaldo en sessionStorage se escribe solo al
 * cambiar sesión/lotes y al ocultar la página (`pagehide`/`visibilitychange`).
 */

interface ScopeFeedState {
  sessionId: string | null
  items: FeedPinItem[]
  batchSizes: number[]
  cursor: string | null
  hasMore: boolean
  scrollY: number
}

const EMPTY_SCOPE_STATE: ScopeFeedState = {
  sessionId: null,
  items: [],
  batchSizes: [],
  cursor: null,
  hasMore: true,
  scrollY: 0,
}

type FeedProviderState = Record<string, ScopeFeedState>

const STORAGE_KEY = 'greener:feed'

function readFromSessionStorage(): FeedProviderState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as {
      pageLoadId: string
      scopes: FeedProviderState
    }
    // El id no coincide: es una carga de documento distinta (recarga
    // real) — el estado guardado no vale, arquitectura §6.1.
    if (parsed.pageLoadId !== pageLoadId) return {}
    return parsed.scopes ?? {}
  } catch {
    return {}
  }
}

function writeToSessionStorage(scopes: FeedProviderState) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ pageLoadId, scopes }),
    )
  } catch {
    // sessionStorage lleno o inaccesible (navegación privada estricta,
    // por ejemplo): es solo el respaldo, el estado en memoria sigue
    // funcionando igual durante esta misma carga del documento.
  }
}

interface FeedContextValue {
  getState: (scope: string) => ScopeFeedState
  setSessionId: (scope: string, sessionId: string) => void
  appendBatch: (
    scope: string,
    batch: {
      items: FeedPinItem[]
      cursor: string
      hasMore: boolean
      rateLimited?: boolean
    },
  ) => void
  setScrollY: (scope: string, y: number) => void
}

const FeedContext = createContext<FeedContextValue | null>(null)

function withScroll(
  scopes: FeedProviderState,
  scrollByScope: Record<string, number>,
): FeedProviderState {
  const result: FeedProviderState = {}
  for (const [scope, state] of Object.entries(scopes)) {
    result[scope] = { ...state, scrollY: scrollByScope[scope] ?? state.scrollY }
  }
  return result
}

export function FeedProvider({ children }: { children: ReactNode }) {
  const [scopes, setScopes] = useState<FeedProviderState>(
    readFromSessionStorage,
  )

  // Scroll por scope, fuera del estado de React (ver comentario de arriba).
  const scrollByScopeRef = useRef<Record<string, number> | null>(null)
  if (scrollByScopeRef.current === null) {
    scrollByScopeRef.current = Object.fromEntries(
      Object.entries(scopes).map(([scope, state]) => [scope, state.scrollY]),
    )
  }

  // Última foto del estado, para escribirla al ocultar la página sin tener
  // que re-suscribir los listeners en cada cambio.
  const scopesRef = useRef(scopes)

  useEffect(() => {
    // Vuelta atrás sin recarga real: no lo maneja React Router, lo
    // maneja el navegador — desactivar la restauración nativa para no
    // pelear con la nuestra (arquitectura §6.2).
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // Solo cambia al abrir sesión o añadir un lote: escritura poco frecuente.
  useEffect(() => {
    scopesRef.current = scopes
    writeToSessionStorage(withScroll(scopes, scrollByScopeRef.current ?? {}))
  }, [scopes])

  // Al salir o pasar a segundo plano se guarda el scroll más reciente.
  useEffect(() => {
    const persist = () =>
      writeToSessionStorage(
        withScroll(scopesRef.current, scrollByScopeRef.current ?? {}),
      )
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persist()
    }

    window.addEventListener('pagehide', persist)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', persist)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const getState = useCallback(
    (scope: string): ScopeFeedState => {
      const state = scopes[scope] ?? EMPTY_SCOPE_STATE
      const scrollY = scrollByScopeRef.current?.[scope]
      return scrollY === undefined ? state : { ...state, scrollY }
    },
    [scopes],
  )

  const setSessionId = useCallback((scope: string, sessionId: string) => {
    setScopes((prev) => ({
      ...prev,
      [scope]: { ...(prev[scope] ?? EMPTY_SCOPE_STATE), sessionId },
    }))
  }, [])

  const appendBatch = useCallback(
    (
      scope: string,
      batch: {
        items: FeedPinItem[]
        cursor: string
        hasMore: boolean
        rateLimited?: boolean
      },
    ) => {
      // Un lote vacío por haberse superado el límite de peticiones
      // (api/feed/[sessionId]/route.ts) es temporal, no «esta sección no
      // tiene contenido»: no debe tocar `hasMore` (PROGRESO §2.19). Tampoco
      // se actualiza nada más del estado: no hay ronda real que registrar.
      if (batch.rateLimited) {
        return
      }

      setScopes((prev) => {
        const current = prev[scope] ?? EMPTY_SCOPE_STATE
        return {
          ...prev,
          [scope]: {
            ...current,
            items: [...current.items, ...batch.items],
            batchSizes: [...current.batchSizes, batch.items.length],
            cursor: batch.cursor,
            // El servidor devuelve hasMore=true siempre (arquitectura
            // §8.5, "el feed no termina") — pero una ronda vacía Y no
            // debida a un límite de peticiones es una señal real y
            // definitiva de que este scope no tiene contenido publicado
            // (generateRound es determinista: si el pool de ese tipo
            // tiene 0 elementos, todas las rondas futuras también
            // vendrán vacías). Sin este corte, el sentinel de prefetch
            // pide ronda tras ronda sin parar nunca en una subhome sin
            // contenido todavía (insights/tools).
            hasMore: batch.items.length > 0 ? batch.hasMore : false,
          },
        }
      })
    },
    [],
  )

  // Sin setState: no re-renderiza ni escribe nada en cada frame de scroll.
  const setScrollY = useCallback((scope: string, y: number) => {
    if (scrollByScopeRef.current) scrollByScopeRef.current[scope] = y
  }, [])

  const value = useMemo<FeedContextValue>(
    () => ({ getState, setSessionId, appendBatch, setScrollY }),
    [getState, setSessionId, appendBatch, setScrollY],
  )

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
}

export function useFeedContext() {
  const context = useContext(FeedContext)
  if (!context) {
    throw new Error('useFeedContext debe usarse dentro de FeedProvider')
  }
  return context
}
