import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/admin/(panel)/authActions', () => ({
  signOutAction: vi.fn(),
}))

import { AdminShell } from '@/components/admin/AdminShell'

// SEC-ADM-A1: el panel tiene botón de cierre de sesión.
describe('AdminShell', () => {
  it('muestra «Cerrar sesión» como botón de un formulario, sin depender de JS', () => {
    const html = renderToStaticMarkup(<AdminShell>contenido</AdminShell>)

    expect(html).toContain('<form')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>[\s\S]*Cerrar sesión/)
    expect(html).toContain('contenido')
  })
})
