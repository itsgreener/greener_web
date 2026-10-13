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
 * Estado del consentimiento de cookies para toda la web pública. Arranca en
 * `unknown` (igual en servidor y en el primer render del cliente, sin
 * desajuste de hidratación) y lo resuelve al montar leyendo la cookie
 * propia. Mientras no sea `accepted`, nada de terceros se carga. La decisión
 * se puede cambiar en cualquier momento desde `/privacy` (CookieChoice).
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConsentStatus>('unknown')
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const resolved = consentStatusOf(readConsentRecord())

    // Resolver la cookie en cliente tras montar es el objetivo (ver arriba).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(resolved)
    setPanelOpen(resolved === 'undecided')
  }, [])

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
    () => ({
      status,
      panelOpen,
      accept,
      reject,
      dismiss,
    }),
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
