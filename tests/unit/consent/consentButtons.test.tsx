// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { ConsentButtons } from '@/components/consent/ConsentButtons'
import {
  ConsentProvider,
  useConsent,
} from '@/modules/consent/client/ConsentProvider'
import { useConsentCopy } from '@/modules/consent/client/useConsentCopy'
import {
  CONSENT_COPY,
  DEFAULT_CONSENT_LOCALE,
} from '@/modules/consent/domain/copy'

function Probe() {
  const { status } = useConsent()
  return <output data-testid="status">{status}</output>
}

function mount(showCurrentChoice?: boolean) {
  return render(
    <ConsentProvider>
      <ConsentButtons className="btn" showCurrentChoice={showCurrentChoice} />
      <Probe />
    </ConsentProvider>,
  )
}

const copy = CONSENT_COPY[DEFAULT_CONSENT_LOCALE]

describe('ConsentButtons', () => {
  beforeEach(() => {
    document.cookie = 'greener_consent=; Max-Age=0; Path=/'
  })

  it('pinta Aceptar y Rechazar, en ese orden y con la misma clase', () => {
    mount()

    const buttons = screen.getAllByRole('button')
    expect(buttons.map((b) => b.textContent)).toEqual([
      copy.accept,
      copy.reject,
    ])
    expect(buttons.every((b) => b.className === 'btn')).toBe(true)
  })

  it('cada botón registra su decisión', () => {
    mount()

    fireEvent.click(screen.getByRole('button', { name: copy.accept }))
    expect(screen.getByTestId('status')).toHaveTextContent('accepted')

    fireEvent.click(screen.getByRole('button', { name: copy.reject }))
    expect(screen.getByTestId('status')).toHaveTextContent('rejected')
  })

  it('sin showCurrentChoice no usa aria-pressed', () => {
    mount()

    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('aria-pressed')
    }
  })

  it('con showCurrentChoice marca solo la decisión vigente', () => {
    mount(true)

    const accept = screen.getByRole('button', { name: copy.accept })
    const reject = screen.getByRole('button', { name: copy.reject })
    expect(accept).toHaveAttribute('aria-pressed', 'false')
    expect(reject).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(reject)
    expect(accept).toHaveAttribute('aria-pressed', 'false')
    expect(reject).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('useConsentCopy', () => {
  it('devuelve los textos del idioma por defecto', () => {
    const { result } = renderHook(() => useConsentCopy())

    expect(result.current).toBe(copy)
  })
})
