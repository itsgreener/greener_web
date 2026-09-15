'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { FeedBatchItem } from '@/modules/feed/application/getFeedSessionBatch'
import { pageLoadId } from './pageLoadId'

/**
 * Arquitectura §6.2: "La opción principal es mantener el estado del feed
 * en el layout cliente durante la navegación interna. Como respaldo, se
 * serializan en sessionStorage únicamente metadatos de batches, cursor y
 * scroll, vinculados al pageLoadId actual."
 *
 * Este Provider vive en (public)/layout.tsx, que Next.js NO desmonta al
 * navegar de / a /work/[slug] y volver (solo desmonta page.tsx) — por
 * eso basta con que el estado viva aquí para que sobreviva a esa
 * navegación sin volver a pedir nada al servidor. sessionStorage es el
 * respaldo, por si el propio layout llegara a desmontarse sin que haya
 * habido una recarga real del documento (caso raro, pero es justo lo
 * que pide la arquitectura).
 */

interface HomeFeedState {
  sessionId: string | null
  items: FeedBatchItem[]
  batchSizes: number[]
  cursor: string | null
  hasMore: boolean
  scrollY: number
}

const EMPTY_STATE: HomeFeedState = {
  sessionId: null,
  items: [],
  batchSizes: [],
  cursor: null,
  hasMore: true,
  scrollY: 0,
}

const STORAGE_KEY = 'greener:home-feed'

function readFromSessionStorage(): HomeFeedState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as HomeFeedState & { pageLoadId: string }
    // El id no coincide: es una carga de documento distinta (recarga
    // real) — el estado guardado no vale, arquitectura §6.1.
    if (parsed.pageLoadId !== pageLoadId) return null
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pageLoadId: _ignored, ...state } = parsed
    return state
  } catch {
    return null
  }
}

function writeToSessionStorage(state: HomeFeedState) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, pageLoadId }),
    )
  } catch {
    // sessionStorage lleno o inaccesible (navegación privada estricta,
    // por ejemplo): es solo el respaldo, el estado en memoria sigue
    // funcionando igual durante esta misma carga del documento.
  }
}

interface HomeFeedContextValue {
  state: HomeFeedState
  setSessionId: (sessionId: string) => void
  appendBatch: (batch: {
    items: FeedBatchItem[]
    cursor: string
    hasMore: boolean
  }) => void
  setScrollY: (y: number) => void
}

const HomeFeedContext = createContext<HomeFeedContextValue | null>(null)

export function HomeFeedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HomeFeedState>(
    () => readFromSessionStorage() ?? EMPTY_STATE,
  )

  useEffect(() => {
    // Vuelta atrás sin recarga real: no lo maneja React Router, lo
    // maneja el navegador — desactivar la restauración nativa para no
    // pelear con la nuestra (arquitectura §6.2).
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    writeToSessionStorage(state)
  }, [state])

  const setSessionId = useCallback((sessionId: string) => {
    setState((prev) => ({ ...prev, sessionId }))
  }, [])

  const appendBatch = useCallback(
    (batch: { items: FeedBatchItem[]; cursor: string; hasMore: boolean }) => {
      setState((prev) => ({
        ...prev,
        items: [...prev.items, ...batch.items],
        batchSizes: [...prev.batchSizes, batch.items.length],
        cursor: batch.cursor,
        hasMore: batch.hasMore,
      }))
    },
    [],
  )

  const setScrollY = useCallback((y: number) => {
    setState((prev) => (prev.scrollY === y ? prev : { ...prev, scrollY: y }))
  }, [])

  const value = useMemo<HomeFeedContextValue>(
    () => ({ state, setSessionId, appendBatch, setScrollY }),
    [state, setSessionId, appendBatch, setScrollY],
  )

  return (
    <HomeFeedContext.Provider value={value}>
      {children}
    </HomeFeedContext.Provider>
  )
}

export function useHomeFeedContext() {
  const context = useContext(HomeFeedContext)
  if (!context) {
    throw new Error('useHomeFeedContext debe usarse dentro de HomeFeedProvider')
  }
  return context
}
