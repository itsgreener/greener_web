import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ pathname: '/admin' }))

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}))

vi.mock('@/app/admin/(panel)/authActions', () => ({
  signOutAction: vi.fn(),
}))

import { AdminShell } from '@/components/admin/AdminShell'
import { isActiveAdminRoute } from '@/components/admin/AdminNavLink'

/** Etiquetas de los enlaces de la barra que llevan aria-current="page". */
function currentLabels(pathname: string): string[] {
  navigation.pathname = pathname
  const html = renderToStaticMarkup(<AdminShell>contenido</AdminShell>)
  return [
    ...html.matchAll(/<a[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/g),
  ].map((match) => match[1].replace(/<span[\s\S]*?<\/span>/g, '').trim())
}

// SEC-ADM-A1: el panel tiene botón de cierre de sesión.
describe('AdminShell', () => {
  it('muestra «Cerrar sesión» como botón de un formulario, sin depender de JS', () => {
    const html = renderToStaticMarkup(<AdminShell>contenido</AdminShell>)

    expect(html).toContain('<form')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Cerrar sesión/)
    expect(html).toContain('contenido')
  })

  describe('ruta activa de la barra lateral', () => {
    it.each([
      ['/admin', 'Panel'],
      ['/admin/contents', 'Contenidos'],
      ['/admin/contents/123', 'Contenidos'],
      ['/admin/contents/123/edit', 'Contenidos'],
      ['/admin/talent/upload', 'Talent'],
      ['/admin/audit', 'Actividad'],
    ])('en %s marca solo «%s»', (pathname, label) => {
      expect(currentLabels(pathname)).toEqual([label])
    })

    it('no marca nada en /admin/contents-old (el prefijo respeta el límite de segmento)', () => {
      expect(currentLabels('/admin/contents-old')).toEqual([])
    })

    it('el Panel no se queda marcado en las subrutas', () => {
      expect(currentLabels('/admin/contents/123')).not.toContain('Panel')
    })

    it('«Ver web» no se marca nunca', () => {
      navigation.pathname = '/'
      const html = renderToStaticMarkup(<AdminShell>contenido</AdminShell>)
      expect(html).not.toContain('aria-current')
    })
  })
})

describe('isActiveAdminRoute', () => {
  it('/admin solo coincide exacto', () => {
    expect(isActiveAdminRoute('/admin', '/admin')).toBe(true)
    expect(isActiveAdminRoute('/admin/talent', '/admin')).toBe(false)
  })

  it('el resto coincide por prefijo con límite de segmento', () => {
    expect(isActiveAdminRoute('/admin/talent', '/admin/talent')).toBe(true)
    expect(isActiveAdminRoute('/admin/talent/x', '/admin/talent')).toBe(true)
    expect(isActiveAdminRoute('/admin/talents', '/admin/talent')).toBe(false)
  })
})
