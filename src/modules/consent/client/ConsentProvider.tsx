'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import {
  CONSENT_TEXT_VERSION,
  choiceFor,
  consentStatusOf,
  createConsentRecord,
  type ConsentDecision,
  type ConsentStatus,
} from '@/modules/consent/domain/consent'
import {
  readConsentRecord,
  writeConsentRecord,
} from '@/modules/consent/client/consentCookie'

interface ConsentContextValue {
  status: ConsentStatus
  /** La ventana está a la vista: solo mientras no haya una decisión vigente. */
  panelOpen: boolean
  accept: () => void
  reject: () => void
  /** La X de la ventana: cuenta como rechazar. */
  dismiss: () => void
}

const ConsentContext = createContext<ConsentContextValue | null>(null)

/**
 * La cookie `greener_consent` es la fuente de verdad y se comparte entre
 * pestañas; React la lee como almacén externo (`useSyncExternalStore`).
 * Se vuelve a leer al decidir en esta pestaña y al volver a ella (foco,
 * visibilidad, `pageshow`), para respetar revocaciones hechas en otra ventana.
 */
const cookieListeners = new Set<() => void>()

function notifyConsentChange(): void {
  for (const listener of cookieListeners) listener()
}

function subscribeToConsentCookie(onChange: () => void): () => void {
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') onChange()
  }

  cookieListeners.add(onChange)
  window.addEventListener('focus', onChange)
  window.addEventListener('pageshow', onChange)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    cookieListeners.delete(onChange)
    window.removeEventListener('focus', onChange)
    window.removeEventListener('pageshow', onChange)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

function readCookieStatus(): ConsentStatus {
  return consentStatusOf(readConsentRecord())
}

/** En el servidor no hay cookie que leer: aún no se sabe. */
function readServerStatus(): ConsentStatus {
  return 'unknown'
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const cookieStatus = useSyncExternalStore(
    subscribeToConsentCookie,
    readCookieStatus,
    readServerStatus,
  )
  // Solo si el navegador bloquea las cookies: la decisión vive en memoria
  // durante esta visita y se volverá a preguntar en la siguiente.
  const [memoryDecision, setMemoryDecision] = useState<ConsentDecision | null>(
    null,
  )

  const status: ConsentStatus =
    cookieStatus === 'undecided' && memoryDecision
      ? memoryDecision
      : cookieStatus
  const panelOpen = status === 'undecided'

  const decide = useCallback(
    (decision: ConsentDecision, closedWithX: boolean) => {
      writeConsentRecord(createConsentRecord(decision))
      const persisted = readCookieStatus() === decision
      setMemoryDecision(persisted ? null : decision)
      notifyConsentChange()

      trackAnalyticsEvent(
        'Cookie Choice',
        {
          choice: choiceFor(decision, closedWithX),
          textVersion: CONSENT_TEXT_VERSION,
        },
        { interactive: true },
      )
    },
    [],
  )

  const accept = useCallback(() => decide('accepted', false), [decide])
  const reject = useCallback(() => decide('rejected', false), [decide])
  const dismiss = useCallback(() => decide('rejected', true), [decide])

  const value = useMemo<ConsentContextValue>(
    () => ({ status, panelOpen, accept, reject, dismiss }),
    [status, panelOpen, accept, reject, dismiss],
  )

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  )
}

export function useConsent(): ConsentContextValue {
  const context = useContext(ConsentContext)

  if (!context) {
    throw new Error('useConsent debe usarse dentro de <ConsentProvider>.')
  }

  return context
}
