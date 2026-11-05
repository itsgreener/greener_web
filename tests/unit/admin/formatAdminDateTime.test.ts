import { describe, expect, it } from 'vitest'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'

// Auditoría 8 oct, P0-9: el ABM muestra siempre la hora de Madrid, sea cual
// sea la zona horaria del proceso Node o del navegador.
describe('formatAdminDateTime', () => {
  it('convierte un instante UTC a la hora de Madrid (verano, UTC+2)', () => {
    expect(formatAdminDateTime('2026-10-08T10:00:00.000Z')).toContain('12:00')
  })

  it('en invierno aplica UTC+1', () => {
    expect(formatAdminDateTime('2026-12-01T10:00:00.000Z')).toContain('11:00')
  })

  it('sin valor (o con uno inválido) devuelve el texto vacío indicado', () => {
    expect(formatAdminDateTime(null)).toBe('—')
    expect(formatAdminDateTime(null, 'Sin publicar')).toBe('Sin publicar')
    expect(formatAdminDateTime('no-es-fecha')).toBe('—')
  })
})
