// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  search: new URLSearchParams(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOAuth: mocks.signInWithOAuth } }),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.search,
}))

import AdminLoginPage from '@/app/admin/(auth)/login/page'

const BUTTON = /continuar con google/i

describe('login del ABM', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mocks.signInWithOAuth.mockReset()
    mocks.search = new URLSearchParams()
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('muestra el título y el botón de Google', () => {
    render(<AdminLoginPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bienvenido' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: BUTTON })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('al pulsar pide el acceso con Google y vuelve por /auth/callback?next=/admin', async () => {
    mocks.signInWithOAuth.mockResolvedValue({ error: null })
    render(<AdminLoginPage />)

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))

    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1))
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    })
  })

  it('mientras conecta, el botón queda desactivado con «Conectando con Google…»', async () => {
    // Sin resolver: la redirección real descarga la página y no vuelve.
    mocks.signInWithOAuth.mockReturnValue(new Promise(() => {}))
    render(<AdminLoginPage />)

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))

    const button = await screen.findByRole('button', {
      name: 'Conectando con Google…',
    })
    expect(button).toBeDisabled()
  })

  it('si Google devuelve error: muestra el mensaje, lo registra y reactiva el botón', async () => {
    const failure = new Error('boom')
    mocks.signInWithOAuth.mockResolvedValue({ error: failure })
    render(<AdminLoginPage />)

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se ha podido iniciar sesión con Google. Inténtalo de nuevo.',
    )
    expect(consoleError).toHaveBeenCalledWith(failure)
    expect(screen.getByRole('button', { name: BUTTON })).toBeEnabled()
  })

  it('un segundo intento limpia el error anterior', async () => {
    mocks.signInWithOAuth
      .mockResolvedValueOnce({ error: new Error('boom') })
      .mockReturnValueOnce(new Promise(() => {}))
    render(<AdminLoginPage />)

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))
    await screen.findByRole('alert')

    fireEvent.click(screen.getByRole('button', { name: BUTTON }))

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it.each([
    ['unauthorized', 'Esa cuenta no tiene acceso al panel'],
    ['oauth', 'No se ha podido iniciar sesión con Google'],
  ])('?error=%s muestra su mensaje con role="alert"', (code, text) => {
    mocks.search = new URLSearchParams({ error: code })
    render(<AdminLoginPage />)

    expect(screen.getByRole('alert')).toHaveTextContent(text)
  })

  it('un código de error desconocido no muestra nada', () => {
    mocks.search = new URLSearchParams({ error: 'otra-cosa' })
    render(<AdminLoginPage />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
