// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('@/modules/analytics/analytics', () => ({
  trackAnalyticsEvent: vi.fn(),
}))

import { useEmbedPlayback } from '@/components/detail/useEmbedPlayback'
import { ConsentProvider } from '@/modules/consent/client/ConsentProvider'
import { writeConsentRecord } from '@/modules/consent/client/consentCookie'
import { createConsentRecord } from '@/modules/consent/domain/consent'

function wrapper({ children }: { children: ReactNode }) {
  return <ConsentProvider>{children}</ConsentProvider>
}

function previousDecision(decision: 'accepted' | 'rejected') {
  writeConsentRecord(createConsentRecord(decision))
}

function setup(embedKey = 'youtube:a') {
  const onPlay = vi.fn()
  const hook = renderHook(
    ({ key }: { key: string }) => useEmbedPlayback({ embedKey: key, onPlay }),
    { wrapper, initialProps: { key: embedKey } },
  )
  return { ...hook, onPlay }
}

describe('useEmbedPlayback', () => {
  beforeEach(() => {
    document.cookie = 'greener_consent=; Max-Age=0; Path=/'
  })

  it('sin decisión previa: play pregunta y no monta nada ni cuenta la reproducción', () => {
    const { result, onPlay } = setup()

    act(() => result.current.play())

    expect(result.current.askingConsent).toBe(true)
    expect(result.current.canRenderEmbed).toBe(false)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('«Not now» cierra la pregunta sin montar nada', () => {
    const { result, onPlay } = setup()

    act(() => result.current.play())
    act(() => result.current.cancel())

    expect(result.current.askingConsent).toBe(false)
    expect(result.current.canRenderEmbed).toBe(false)
    expect(onPlay).not.toHaveBeenCalled()
  })

  it('aceptar y reproducir monta el reproductor y cuenta una reproducción', () => {
    const { result, onPlay } = setup()

    act(() => result.current.play())
    act(() => result.current.acceptAndPlay())

    expect(result.current.askingConsent).toBe(false)
    expect(result.current.canRenderEmbed).toBe(true)
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('quien ya aceptó monta con un solo clic, sin preguntar', () => {
    previousDecision('accepted')
    const { result, onPlay } = setup()

    act(() => result.current.play())

    expect(result.current.askingConsent).toBe(false)
    expect(result.current.canRenderEmbed).toBe(true)
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('quien rechazó recibe la pregunta al pulsar play', () => {
    previousDecision('rejected')
    const { result } = setup()

    act(() => result.current.play())

    expect(result.current.askingConsent).toBe(true)
    expect(result.current.canRenderEmbed).toBe(false)
  })

  it('la aprobación vale solo para su embed', () => {
    const { result, rerender } = setup('youtube:a')

    act(() => result.current.play())
    act(() => result.current.acceptAndPlay())
    expect(result.current.canRenderEmbed).toBe(true)

    rerender({ key: 'youtube:b' })

    expect(result.current.canRenderEmbed).toBe(false)
  })
})
