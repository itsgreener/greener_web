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
import { usePathname } from 'next/navigation'

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
 * El consentimiento se comparte mediante una cookie entre pestañas, pero el
 * estado de React no. Sincronizamos al montar, al cambiar de ruta y al volver
 * a una pestaña para respetar revocaciones hechas en otra ventana.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<ConsentStatus>('unknown')
  const [panelOpen, setPanelOpen] = useState(false)

  const syncFromCookie = useCallback(() => {
    const resolved = consentStatusOf(readConsentRecord())
    setStatus(resolved)
    setPanelOpen(resolved === 'undecided')
  }, [])

  useEffect(() => {
    syncFromCookie()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncFromCookie()
    }

    const onFocus = () => syncFromCookie()
    const onPageShow = () => syncFromCookie()

    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [pathname, syncFromCookie])

  const decide = useCallback(
    (decision: ConsentDecision, closedWithX: boolean) => {
      writeConsentRecord(createConsentRecord(decision))
      setStatus(decision)
      setPanelOpen(false)

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
