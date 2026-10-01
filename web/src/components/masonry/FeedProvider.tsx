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
    batch: {
      items: FeedBatchItem[]
      cursor: string
      hasMore: boolean
      rateLimited?: boolean
    },
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
      batch: {
        items: FeedBatchItem[]
        cursor: string
        hasMore: boolean
        rateLimited?: boolean
      },
    ) => {
      // Bug real corregido el 30 sep (PROGRESO §2.19 — rompía el scroll
      // de la home): un lote vacío por haberse superado el límite de
      // peticiones (api/feed/[sessionId]/route.ts, §2.16) es temporal,
      // no "esta sección no tiene contenido" — no debe tocar `hasMore`.
      // Antes de esta marca, los dos casos eran indistinguibles aquí
      // (ambos llegaban como "0 items") y se trataban igual, cortando
      // el scroll para siempre en vez de solo hasta el minuto
      // siguiente. No se actualiza nada más del estado tampoco: no hay
      // ronda real que registrar.
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
