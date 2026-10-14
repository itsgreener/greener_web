import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({})),
}))

function makeRequest(pathname: string) {
  return new NextRequest(
    new URL(pathname, 'http://localhost:3000').toString(),
    { headers: { 'user-agent': 'TestBot/1.0' } },
  )
}

describe('proxy — trampas para bots', () => {
  it.each(['/internal/client-list', '/wp-login.php', '/.env'])(
    '%s responde 404 sin CSP, sin caché y con noindex',
    async (pathname) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { proxy } = await import('@/proxy')

      const response = await proxy(makeRequest(pathname))

      expect(response.status).toBe(404)
      expect(response.headers.get('Cache-Control')).toBe('no-store')
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
      expect(response.headers.get('Content-Security-Policy')).toBeNull()
      warn.mockRestore()
    },
  )

  it('una ruta normal sigue su camino y no se registra nada', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { proxy } = await import('@/proxy')

    const response = await proxy(makeRequest('/tools/mi-tool'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
