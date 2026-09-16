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
 * Vive en (public)/layout.tsx, que Next.js NO desmonta al navegar entre
 * la home/subhomes y un detalle y volver (solo desmonta page.tsx) — por
 * eso basta con que el estado viva aquí para que sobreviva a esa
 * navegación sin volver a pedir nada al servidor. sessionStorage es el
 * respaldo, por si el propio layout llegara a desmontarse sin que haya
 * habido una recarga real del documento.
 *
 * 15 sep: generalizado de "solo home" a un estado por scope
 * (home/work/insights/tools/channel) — cada subhome necesita la misma
 * persistencia al entrar en un detalle y volver, pero cada una con su
 * propio universo de pines, sesión y scroll, no uno compartido.
 */

interface ScopeFeedState {
  sessionId: string | null
  items: FeedBatchItem[]
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
    batch: { items: FeedBatchItem[]; cursor: string; hasMore: boolean },
  ) => void
  setScrollY: (scope: string, y: number) => void
}

const FeedContext = createContext<FeedContextValue | null>(null)

export function FeedProvider({ children }: { children: ReactNode }) {
  const [scopes, setScopes] = useState<FeedProviderState>(
    readFromSessionStorage,
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
    writeToSessionStorage(scopes)
  }, [scopes])

  const getState = useCallback(
    (scope: string) => scopes[scope] ?? EMPTY_SCOPE_STATE,
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
      batch: { items: FeedBatchItem[]; cursor: string; hasMore: boolean },
    ) => {
      setScopes((prev) => {
        const current = prev[scope] ?? EMPTY_SCOPE_STATE
        return {
          ...prev,
          [scope]: {
            ...current,
            items: [...current.items, ...batch.items],
            batchSizes: [...current.batchSizes, batch.items.length],
            cursor: batch.cursor,
            hasMore: batch.hasMore,
          },
        }
      })
    },
    [],
  )

  const setScrollY = useCallback((scope: string, y: number) => {
    setScopes((prev) => {
      const current = prev[scope] ?? EMPTY_SCOPE_STATE
      if (current.scrollY === y) return prev
      return { ...prev, [scope]: { ...current, scrollY: y } }
    })
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
