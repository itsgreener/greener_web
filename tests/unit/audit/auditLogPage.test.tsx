// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

const listAuditLog = vi.hoisted(() => vi.fn())

vi.mock('@/modules/audit/container', () => ({ listAuditLog }))

import AuditLogPage from '@/app/admin/(panel)/audit/page'

async function renderPage(params: Record<string, string> = {}) {
  render(await AuditLogPage({ searchParams: Promise.resolve(params) }))
}

describe('/admin/audit — visor de solo lectura', () => {
  beforeEach(() => {
    listAuditLog.mockReset()
  })

  it('lista los registros con quién, acción, entidad y detalle', async () => {
    listAuditLog.mockResolvedValue({
      total: 2,
      items: [
        {
          id: '1',
          actorEmail: 'ana@greener.com',
          action: 'publish',
          entity: 'content',
          entityId: ID,
          payload: { previous_status: 'draft' },
          createdAt: '2026-10-16T09:00:00Z',
        },
        {
          id: '2',
          actorEmail: 'system:pg_cron',
          action: 'publish',
          entity: 'content',
          entityId: null,
          payload: null,
          createdAt: '2026-10-16T09:01:00Z',
        },
      ],
    })

    await renderPage()

    expect(screen.getByText('ana@greener.com')).toBeInTheDocument()
    expect(screen.getByText('system:pg_cron')).toBeInTheDocument()
    expect(screen.getByText('2 registros')).toBeInTheDocument()
    expect(screen.getByText(/"previous_status": "draft"/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /3c9a5b8e/ })).toHaveAttribute(
      'href',
      `/admin/contents/${ID}/edit`,
    )
  })

  it('es de solo lectura: ningún botón de acción ni formulario que no sea el de filtrar', async () => {
    listAuditLog.mockResolvedValue({ total: 0, items: [] })

    await renderPage()

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Filtrar'])
    expect(
      screen.queryByRole('button', { name: /borrar|eliminar|editar|guardar/i }),
    ).toBeNull()
  })

  it('pasa los filtros de la URL al caso de uso', async () => {
    listAuditLog.mockResolvedValue({ total: 0, items: [] })

    await renderPage({ q: 'ana', entity: 'pin', page: '2' })

    expect(listAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'ana', entity: 'pin', page: 2 }),
    )
    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
  })

  it('sin actividad lo dice, y con más de una página enseña la paginación', async () => {
    listAuditLog.mockResolvedValue({ total: 0, items: [] })
    await renderPage()
    expect(screen.getByText('Aún no hay actividad')).toBeInTheDocument()
  })

  it('paginación', async () => {
    listAuditLog.mockResolvedValue({
      total: 120,
      items: [
        {
          id: '1',
          actorEmail: 'ana@greener.com',
          action: 'create',
          entity: 'pin',
          entityId: null,
          payload: null,
          createdAt: '2026-10-16T09:00:00Z',
        },
      ],
    })

    await renderPage({ page: '2' })

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Siguiente/ })).toHaveAttribute(
      'href',
      '/admin/audit?page=3',
    )
    expect(screen.getByRole('link', { name: /Anterior/ })).toHaveAttribute(
      'href',
      '/admin/audit',
    )
  })
})
