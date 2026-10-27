// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { EmbedConsentPrompt } from '@/components/detail/EmbedConsentPrompt'
import { embedConsentCopy } from '@/components/detail/EmbedConsentPrompt/copy'

describe('EmbedConsentPrompt', () => {
  it('nombra al proveedor en el título y en el texto legal', () => {
    render(
      <EmbedConsentPrompt
        provider="YouTube"
        onAccept={() => {}}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByText('YouTube content')).toBeInTheDocument()
    expect(
      screen.getByText(/Nothing is loaded from YouTube until you accept/),
    ).toBeInTheDocument()
  })

  it('enlaza a la política de cookies en una pestaña nueva', () => {
    render(
      <EmbedConsentPrompt
        provider="Spotify"
        onAccept={() => {}}
        onCancel={() => {}}
      />,
    )

    const link = screen.getByRole('link', { name: 'Privacy & Cookies' })
    expect(link).toHaveAttribute('href', '/privacy#cookies')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener')
  })

  it('«Accept cookies and play» y «Not now» llaman a su callback', () => {
    const onAccept = vi.fn()
    const onCancel = vi.fn()
    render(
      <EmbedConsentPrompt
        provider="YouTube"
        onAccept={onAccept}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Accept cookies and play' }),
    )
    expect(onAccept).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('embedConsentCopy', () => {
  it('el texto cambia solo en el nombre del proveedor', () => {
    const youtube = embedConsentCopy('YouTube')
    const spotify = embedConsentCopy('Spotify')

    expect(youtube.intro.replaceAll('YouTube', 'X')).toBe(
      spotify.intro.replaceAll('Spotify', 'X'),
    )
    expect(youtube.accept).toBe(spotify.accept)
    expect(youtube.cancel).toBe(spotify.cancel)
  })
})
