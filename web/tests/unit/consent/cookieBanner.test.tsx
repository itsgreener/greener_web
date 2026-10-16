// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { CookieBanner } from '@/components/consent/CookieBanner'
import { trackAnalyticsEvent } from '@/modules/analytics/analytics'
import {
  ConsentProvider,
  useConsent,
} from '@/modules/consent/client/ConsentProvider'
import { writeConsentRecord } from '@/modules/consent/client/consentCookie'
import {
  CONSENT_TEXT_VERSION,
  createConsentRecord,
} from '@/modules/consent/domain/consent'

function clearCookie() {
  document.cookie = 'greener_consent=; Max-Age=0; Path=/'
}

function Probe() {
  const { status } = useConsent()
  return <output data-testid="status">{status}</output>
}

function mount() {
  return render(
    <ConsentProvider>
      <p>Contenido</p>
      <CookieBanner />
      <Probe />
    </ConsentProvider>,
  )
}

function storedDecision() {
  const entry = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('greener_consent='))
  if (!entry) return null
  return JSON.parse(decodeURIComponent(entry.split('=')[1])).d
}

describe('Ventana de cookies', () => {
  beforeEach(() => {
    vi.mocked(trackAnalyticsEvent).mockClear()
    clearCookie()
    window.sessionStorage.clear()
    window.localStorage.clear()
  })

  it('en la primera visita aparece, sin bloquear la página (no modal)', () => {
    mount()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'false')
    expect(screen.getByText('Contenido')).toBeVisible()
    expect(screen.getByTestId('status')).toHaveTextContent('undecided')
  })

  it('Aceptar y Rechazar son botones del mismo tipo y misma clase (mismo peso visual)', () => {
    mount()

    const accept = screen.getByRole('button', { name: 'Accept' })
    const reject = screen.getByRole('button', { name: 'Reject' })

    expect(accept.className).toBe(reject.className)
    expect(accept.tagName).toBe(reject.tagName)
  })

  it('enlaza a la política', () => {
    mount()

    expect(screen.getByRole('link', { name: 'Cookie Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    )
  })

  it('Aceptar guarda la decisión, cierra y mide la elección', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedDecision()).toBe('accepted')
    expect(screen.getByTestId('status')).toHaveTextContent('accepted')
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      'Cookie Choice',
      { choice: 'accept', textVersion: CONSENT_TEXT_VERSION },
      { interactive: true },
    )
  })

  it('Rechazar guarda la decisión, cierra y mide la elección', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedDecision()).toBe('rejected')
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      'Cookie Choice',
      { choice: 'reject', textVersion: CONSENT_TEXT_VERSION },
      { interactive: true },
    )
  })

  it('la X rechaza y se mide aparte como «close»', () => {
    mount()

    fireEvent.click(
      screen.getByRole('button', { name: 'Close and reject cookies' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(storedDecision()).toBe('rejected')
    expect(trackAnalyticsEvent).toHaveBeenCalledWith(
      'Cookie Choice',
      { choice: 'close', textVersion: CONSENT_TEXT_VERSION },
      { interactive: true },
    )
  })

  it('hacer scroll, clic fuera o pulsar Escape NO cierran ni deciden nada', () => {
    mount()

    fireEvent.scroll(window, { target: { scrollY: 800 } })
    fireEvent.click(screen.getByText('Contenido'))
    fireEvent.mouseDown(document.body)
    fireEvent.keyDown(document.body, { key: 'Escape' })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(storedDecision()).toBeNull()
    expect(trackAnalyticsEvent).not.toHaveBeenCalled()
  })

  it('con una decisión vigente no se muestra al entrar', () => {
    writeConsentRecord(createConsentRecord('accepted'))

    mount()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent('accepted')
  })

  it('una decisión de otra versión del texto o caducada vuelve a preguntar', () => {
    document.cookie = `greener_consent=${encodeURIComponent(
      JSON.stringify({
        d: 'accepted',
        v: '2020-01-01',
        t: new Date().toISOString(),
      }),
    )}; Path=/`

    mount()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent('undecided')
  })

  it('la X también rechaza cuando el panel se abre por primera vez tras caducar una decisión anterior', () => {
    document.cookie = `greener_consent=${encodeURIComponent(
      JSON.stringify({
        d: 'accepted',
        v: '2020-01-01',
        t: new Date().toISOString(),
      }),
    )}; Path=/`
    mount()

    fireEvent.click(
      screen.getByRole('button', { name: 'Close and reject cookies' }),
    )

    expect(storedDecision()).toBe('rejected')
    expect(screen.getByTestId('status')).toHaveTextContent('rejected')
  })

  it('una vez decidido no vuelve a salir hasta que la decisión caduque o cambie el texto', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Your current choice: rejected.'),
    ).not.toBeInTheDocument()
  })

  it('la cookie de consentimiento es lo único que se escribe: ni sessionStorage ni localStorage', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
    expect(
      document.cookie.split(';').map((c) => c.trim().split('=')[0]),
    ).toEqual(['greener_consent'])
  })

  it('el evento medido no lleva identificador ni nada personal', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

    const [, props] = vi.mocked(trackAnalyticsEvent).mock.calls[0]
    expect(Object.keys(props as object).sort()).toEqual([
      'choice',
      'textVersion',
    ])
  })

  it('una revocación hecha en otra pestaña se aplica al volver a esta', () => {
    writeConsentRecord(createConsentRecord('accepted'))
    mount()
    expect(screen.getByTestId('status')).toHaveTextContent('accepted')

    // Otra pestaña revoca: la cookie cambia sin que esta pestaña haga nada.
    writeConsentRecord(createConsentRecord('rejected'))
    fireEvent.focus(window)

    expect(screen.getByTestId('status')).toHaveTextContent('rejected')
  })

  it('con las cookies bloqueadas, la decisión vale durante la visita y la ventana se cierra', () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => '',
      set: () => {},
    })

    try {
      mount()
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByTestId('status')).toHaveTextContent('accepted')

      // Volver a la pestaña no reabre la ventana.
      fireEvent.focus(window)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      // Quita la propiedad propia y vuelve la de Document.prototype.
      delete (document as unknown as { cookie?: string }).cookie
    }
  })
})
