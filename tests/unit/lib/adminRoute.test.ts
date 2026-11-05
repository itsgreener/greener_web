import { describe, expect, it } from 'vitest'

import { isAdminRoute } from '@/lib/adminRoute'

// SEC-ADM-A4 y SEC-T3: tabla de rutas del apartado 4.1 de la auditoría.
describe('isAdminRoute', () => {
  it.each([
    '/admin',
    '/admin/',
    '/admin/login',
    '/admin/contents',
    '/admin/contents/123/edit',
    '/api/admin',
    '/api/admin/',
    '/api/admin/media/sign',
    '/api/admin/talent/cv',
  ])('%s es del ABM', (pathname) => {
    expect(isAdminRoute(pathname)).toBe(true)
  })

  // Falla cerrado: el proxy ve la ruta sin normalizar, y estas variantes
  // podrían acabar en el ABM después de que Next las normalice.
  it.each([
    '/admin%2f',
    '/admin%2F',
    '/admin%00',
    '/admin;x',
    '/admin.json',
    '/admin\\x',
    '/admin?',
    '/api/admin%2f',
    '/api/admin;x',
  ])('%s se trata como ABM aunque sea una variante rara', (pathname) => {
    expect(isAdminRoute(pathname)).toBe(true)
  })

  it.each([
    '/administrator',
    '/administracion',
    '/admin-panel',
    '/admin_panel',
    '/admin2',
    '/adminx/foo',
    '/api/administrator',
    '/api/admin-tools',
    '/',
    '/contact',
    '/tools/mi-tool',
    '/auth/callback',
    '/api/feed/abc',
  ])('%s no es del ABM', (pathname) => {
    expect(isAdminRoute(pathname)).toBe(false)
  })

  it('distingue mayúsculas: /ADMIN no es /admin (Next no los trata igual)', () => {
    expect(isAdminRoute('/ADMIN')).toBe(false)
    expect(isAdminRoute('/Admin/contents')).toBe(false)
  })
})
