// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@testing-library/jest-dom/vitest'

import NotFound from '@/app/not-found'
import PublicNotFound from '@/app/(public)/not-found'
import RootError from '@/app/error'
import PublicError from '@/app/(public)/error'
import GlobalError from '@/app/global-error'

afterEach(() => {
  vi.restoreAllMocks()
})

const boom = () => Object.assign(new Error('boom'), { digest: 'abc' })

describe('404', () => {
  it.each([
    ['raíz (rutas sin coincidencia)', NotFound],
    ['(public) (notFound() de una página pública)', PublicNotFound],
  ])(
    '%s: muestra el mensaje y un enlace de vuelta a la home',
    (_name, Page) => {
      render(<Page />)

      expect(
        screen.getByRole('heading', { name: 'Page not found' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Back to home' }),
      ).toHaveAttribute('href', '/')
    },
  )

  it('la 404 de la raíz aporta su propio <main> (no hay Shell); la de (public) no (el Shell ya lo tiene)', () => {
    const root = render(<NotFound />)
    expect(root.container.querySelector('main')).not.toBeNull()
    root.unmount()

    const publicView = render(<PublicNotFound />)
    expect(publicView.container.querySelector('main')).toBeNull()
  })
})

describe('error', () => {
  it.each([
    ['raíz', RootError],
    ['(public)', PublicError],
  ])(
    '%s: muestra el mensaje, reintenta con «Try again» y vuelve a la home',
    (_name, Page) => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const reset = vi.fn()

      render(<Page error={boom()} reset={reset} />)

      expect(
        screen.getByRole('heading', { name: 'Something went wrong' }),
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
      expect(reset).toHaveBeenCalledOnce()

      expect(
        screen.getByRole('link', { name: 'Back to home' }),
      ).toHaveAttribute('href', '/')
    },
  )

  it('deja el error en la consola (no hay error tracking todavía)', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = boom()

    render(<PublicError error={error} reset={() => {}} />)

    expect(consoleError).toHaveBeenCalledWith(error)
  })
})

describe('global-error', () => {
  it('pinta su propio <html>/<body> con mensaje, reintento y enlace plano a la home', () => {
    const markup = renderToStaticMarkup(
      <GlobalError error={boom()} reset={() => {}} />,
    )

    expect(markup).toContain('<html lang="en">')
    expect(markup).toContain('Something went wrong')
    expect(markup).toContain('Try again')
    expect(markup).toContain('<a href="/">Back to home</a>')
  })
})
