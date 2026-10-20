// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import {
  fireEvent,
  render as rtlRender,
  screen,
  within,
} from '@testing-library/react'
import type { ReactElement } from 'react'
import '@testing-library/jest-dom/vitest'
import PrivacyPage, { metadata } from '@/app/(public)/privacy/page'
import { POLICY } from '@/app/(public)/privacy/policyContent'
import { ConsentProvider } from '@/modules/consent/client/ConsentProvider'
import { CONSENT_TEXT_VERSION } from '@/modules/consent/domain/consent'

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: ConsentProvider })
}

function storedDecision() {
  const entry = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('greener_consent='))
  return entry ? JSON.parse(decodeURIComponent(entry.split('=')[1])).d : null
}

describe('/privacy — prueba de humo', () => {
  it('pinta el título y la fecha de la última actualización', () => {
    render(<PrivacyPage />)

    expect(
      screen.getByRole('heading', { name: 'Privacy & Cookies', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('19 October 2026')).toBeInTheDocument()
    expect(screen.queryByText(/placeholder/i)).not.toBeInTheDocument()
  })

  it('el título de la pestaña es "Privacy & Cookies"', () => {
    expect(metadata.title).toBe('Privacy & Cookies')
  })

  it('la fecha del texto y la versión que reabre la ventana de cookies son la misma', () => {
    expect(POLICY.lastUpdatedIso).toBe(CONSENT_TEXT_VERSION)
  })

  it('declara el almacenamiento real: greener:feed, greener_visitor y greener_consent, y no el inexistente greener_seed', () => {
    render(<PrivacyPage />)

    const table = screen.getAllByRole('table')[0]
    for (const name of ['greener:feed', 'greener_visitor', 'greener_consent']) {
      expect(within(table).getByText(name)).toBeInTheDocument()
    }
    expect(screen.queryByText('greener_seed')).not.toBeInTheDocument()
  })

  it('las dos partes tienen su ancla (#privacy y #cookies), en ese orden, y son apartados principales', () => {
    const { container } = render(<PrivacyPage />)

    const privacy = container.querySelector('#privacy')
    const cookies = container.querySelector('#cookies')

    expect(privacy).toHaveTextContent('Privacy policy')
    expect(cookies).toHaveTextContent('Cookie policy')
    expect(privacy?.tagName).toBe('H2')
    expect(cookies?.tagName).toBe('H2')
    expect(
      privacy!.compareDocumentPosition(cookies!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('el bloque «Your cookie choice» queda antes de las dos partes, al principio de la página', () => {
    const { container } = render(<PrivacyPage />)

    const choice = container.querySelector('#cookie-choice')!
    const privacy = container.querySelector('#privacy')!

    expect(
      choice.compareDocumentPosition(privacy) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('los ids de las secciones no se repiten (los enlaces con ancla dependen de ello)', () => {
    const ids = POLICY.sections.map((section) => section.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['privacy', 'cookies']))
  })

  it('el correo del formulario sale por el servicio de correo de Dinahosting, hacia el buzón de Google Workspace', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''

    expect(text).toMatch(
      /through the mail service of our hosting provider, Dinahosting/,
    )
    expect(text).toMatch(/Dinahosting: site hosting and the mail service/)
    expect(text).toContain('Google Workspace')
    // Ya no existe el proveedor sin nombre.
    expect(text).not.toContain("The site's email sending service")
  })

  it('el registro antiabuso del formulario declara el mensaje de error y su borrado a los 30 días', () => {
    const { container } = render(<PrivacyPage />)
    const section = container.querySelector('#form-abuse')!.parentElement!

    expect(section.textContent).toMatch(/technical error message/)
    expect(section.textContent).toMatch(/deleted automatically after 30 days/)
    expect(section.textContent).toMatch(/we do not store the IP address itself/)
  })

  it('declara los registros de seguridad del servidor (trampas para bots): qué se guarda, para qué y cuánto', () => {
    const { container } = render(<PrivacyPage />)
    const section = container.querySelector('#security-logs')!.parentElement!

    expect(section.textContent).toMatch(/your IP address/)
    expect(section.textContent).toMatch(/user agent/)
    expect(section.textContent).toMatch(/detect and block abusive traffic/)
    expect(section.textContent).toMatch(/after 30 days/)
  })

  it('la tabla de terceros lleva los siete elementos de la auditoría, con sus nombres completos', () => {
    render(<PrivacyPage />)

    const table = screen.getAllByRole('table')[1]
    for (const name of [
      'sp_t',
      'sp_landing',
      'sentryReplaySession',
      'yt-player-caption-persistence',
      'yt-icons-last-purged',
      'ytidb::LAST_RESULT_ENTRY_KEY',
      'YtIdbMeta',
    ]) {
      expect(within(table).getByText(name)).toBeInTheDocument()
    }
  })

  it('los botones que cita el texto coinciden con la interfaz', () => {
    const { container } = render(<PrivacyPage />)
    const text = container.textContent ?? ''

    for (const label of [
      '"Accept"',
      '"Reject"',
      '"Accept cookies and play"',
      '"Not now"',
      '"Your cookie choice"',
      '"Privacy & Cookies"',
    ]) {
      expect(text).toContain(label)
    }
  })

  it('indica dónde se cambia la decisión: en esta página, a la que lleva «Privacy & Cookies» del menú (la web no tiene pie de página)', () => {
    render(<PrivacyPage />)

    expect(
      screen.getByText(/Your cookie choice.*Privacy & Cookies/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/footer/i)).not.toBeInTheDocument()
  })

  it('el contacto es hi@itsgreener.com y no hello@', () => {
    const { container } = render(<PrivacyPage />)

    expect(container.textContent).toContain('hi@itsgreener.com')
    expect(container.textContent).not.toContain('hello@')
  })

  it('los enlaces a las políticas de los terceros de vídeo abren fuera y de forma segura', () => {
    render(<PrivacyPage />)

    for (const name of ['Google (YouTube)', 'Spotify']) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('tiene el bloque «Your cookie choice» con el ancla a la que lleva «Cookies» del menú', () => {
    const { container } = render(<PrivacyPage />)

    const block = container.querySelector('#cookie-choice')
    expect(block).not.toBeNull()
    expect(
      within(block as HTMLElement).getByRole('heading', {
        name: 'Your cookie choice',
      }),
    ).toBeInTheDocument()
  })

  it('desde el bloque se puede aceptar y volver a rechazar, y el estado se actualiza', () => {
    document.cookie = 'greener_consent=; Max-Age=0; Path=/'
    render(<PrivacyPage />)

    expect(screen.getByText(/You have not made a choice yet/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(storedDecision()).toBe('accepted')
    expect(screen.getByText(/cookies accepted/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Accept' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    expect(storedDecision()).toBe('rejected')
    expect(screen.getByText(/cookies rejected/)).toBeVisible()
  })

  it('Aceptar y Rechazar son iguales (misma clase)', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('button', { name: 'Accept' }).className).toBe(
      screen.getByRole('button', { name: 'Reject' }).className,
    )
  })

  describe('sección «Newsletter» (plan de `other`, fase 3)', () => {
    it('existe con el ancla #newsletter a la que apunta el pin del feed', () => {
      const { container } = render(<PrivacyPage />)

      const heading = container.querySelector('#newsletter')
      expect(heading).not.toBeNull()
      expect(heading).toHaveTextContent('Newsletter')
      expect(POLICY.sections.map((section) => section.id)).toContain(
        'newsletter',
      )
    })

    it('declara responsable, Mailchimp, doble confirmación, la cookie y la medición anónima', () => {
      const { container } = render(<PrivacyPage />)
      const text = container.textContent ?? ''

      for (const expected of [
        'XAGA Creatividad Interactiva',
        'Mailchimp',
        'double opt-in',
        'greener_newsletter',
        'Plausible',
      ]) {
        expect(text).toContain(expected)
      }
      // No se carga nada de Mailchimp en el navegador: el texto lo dice.
      expect(text).toMatch(/loads no Mailchimp script or form/)
    })

    it('la cookie greener_newsletter figura en la tabla de almacenamiento propio, con 12 meses', () => {
      render(<PrivacyPage />)

      const table = screen.getAllByRole('table')[0]
      const row = within(table).getByText('greener_newsletter').closest('tr')!
      expect(within(row).getByText('Cookie')).toBeInTheDocument()
      expect(within(row).getByText('12 months')).toBeInTheDocument()
    })

    it('el enlace del pin y el id de la sección no se desincronizan', () => {
      // La tarjeta enlaza a /privacy#newsletter: si cambia uno, cambia el otro.
      expect(
        POLICY.sections.some((section) => section.id === 'newsletter'),
      ).toBe(true)
    })
  })
})
