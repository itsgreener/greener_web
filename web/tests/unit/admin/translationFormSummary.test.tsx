// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import ContentTranslations from '@/app/admin/contents/[id]/edit/ContentTranslations'

vi.mock('@/app/admin/contents/[id]/edit/translationActions', () => ({
  saveTranslationAction: vi.fn(),
}))

// 7 oct 2026: un episodio no tiene summary (su texto es highlight + body);
// el campo era un resto de tool/insight, cuando tenían página de detalle.

function renderFor(contentType: 'episode' | 'case' | 'tool') {
  render(
    <ContentTranslations
      contentId="11111111-1111-4111-8111-111111111111"
      contentType={contentType}
      defaultLocale="es"
      translations={[]}
    />,
  )
}

describe('campo Summary del ABM según el tipo', () => {
  it('un case no lo muestra, pero sí Highlight y Body', () => {
    renderFor('case')

    expect(screen.queryByLabelText('Summary')).toBeNull()
    expect(screen.getAllByLabelText('Highlight').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Body').length).toBeGreaterThan(0)
  })

  it('un episodio no lo muestra, pero sí Highlight y Body', () => {
    renderFor('episode')

    expect(screen.queryByLabelText('Summary')).toBeNull()
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Body')).toBeInTheDocument()
  })

  it('una tool sí lo muestra', () => {
    renderFor('tool')

    expect(screen.getAllByLabelText('Summary').length).toBeGreaterThan(0)
  })
})
