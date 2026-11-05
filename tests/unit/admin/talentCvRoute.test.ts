import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const CANDIDATE = '0b1f1a52-3b8e-4a0e-9c1d-5d4e6f7a8b9c'
const FILE = '5a1c7d3e-9f4b-4c2a-8e6d-1b3f5a7c9e0d'

const adminApiGuard = vi.fn()
const getAdminActor = vi.fn()
const recordAuditEvent = vi.fn()
const resolveCvLink = vi.fn()

vi.mock('@/lib/auth/adminSession', () => ({
  adminApiGuard: () => adminApiGuard(),
  getAdminActor: () => getAdminActor(),
}))

vi.mock('@/modules/audit/container', () => ({
  recordAuditEvent: (event: unknown) => recordAuditEvent(event),
}))

vi.mock('@/modules/talent/container', () => ({
  resolveCvLink: (target: unknown) => resolveCvLink(target),
}))

const { GET } = await import('@/app/api/admin/talent/cv/route')

function request(search: string) {
  return new NextRequest(`https://itsgreener.com/api/admin/talent/cv${search}`)
}

beforeEach(() => {
  adminApiGuard.mockReset().mockResolvedValue(null)
  getAdminActor.mockReset().mockResolvedValue({ email: 'ana@itsgreener.com' })
  recordAuditEvent.mockReset().mockResolvedValue(true)
  resolveCvLink.mockReset().mockResolvedValue({
    ok: true,
    kind: 'bucket',
    url: 'https://talent.supabase.co/storage/v1/object/sign/cvs/uploads/a.pdf?token=t',
  })
})

describe('GET /api/admin/talent/cv', () => {
  it('sin sesión de admin devuelve lo que diga la guarda y no toca nada', async () => {
    adminApiGuard.mockResolvedValue(
      NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    )

    const response = await GET(request(`?candidate=${CANDIDATE}`))

    expect(response.status).toBe(401)
    expect(resolveCvLink).not.toHaveBeenCalled()
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('sin email de admin en la sesión no abre nada', async () => {
    getAdminActor.mockResolvedValue(null)

    expect((await GET(request(`?candidate=${CANDIDATE}`))).status).toBe(401)
    expect(resolveCvLink).not.toHaveBeenCalled()
  })

  it.each([
    '',
    '?candidate=no-es-uuid',
    `?candidate=${CANDIDATE}&file=tampoco`,
    '?path=uploads/a.pdf',
  ])(
    'parámetros no válidos (%s): 400, sin consultar ni anotar',
    async (search) => {
      const response = await GET(request(search))

      expect(response.status).toBe(400)
      expect(resolveCvLink).not.toHaveBeenCalled()
      expect(recordAuditEvent).not.toHaveBeenCalled()
    },
  )

  it('anota la apertura y redirige (302, sin caché) a la URL firmada', async () => {
    const response = await GET(request(`?candidate=${CANDIDATE}`))

    expect(resolveCvLink).toHaveBeenCalledWith({
      candidateId: CANDIDATE,
      fileId: null,
    })
    expect(recordAuditEvent).toHaveBeenCalledWith({
      actorEmail: 'ana@itsgreener.com',
      action: 'talent.cv_open',
      entity: 'talent_candidate',
      entityId: CANDIDATE,
      payload: { kind: 'bucket' },
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain(
      '/storage/v1/object/sign/',
    )
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('un fichero suelto se anota como file_open con su id', async () => {
    await GET(request(`?candidate=${CANDIDATE}&file=${FILE}`))

    expect(resolveCvLink).toHaveBeenCalledWith({
      candidateId: CANDIDATE,
      fileId: FILE,
    })
    expect(recordAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'talent.file_open',
        payload: { fileId: FILE, kind: 'bucket' },
      }),
    )
  })

  it('si no se puede anotar, no se abre el fichero', async () => {
    recordAuditEvent.mockResolvedValue(false)

    const response = await GET(request(`?candidate=${CANDIDATE}`))

    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
  })

  it('un candidato sin ese CV es 404 y no se anota nada', async () => {
    resolveCvLink.mockResolvedValue({ ok: false, reason: 'not_found' })

    const response = await GET(request(`?candidate=${CANDIDATE}`))

    expect(response.status).toBe(404)
    expect(recordAuditEvent).not.toHaveBeenCalled()
  })

  it('si falla Supabase-talent, 503', async () => {
    resolveCvLink.mockResolvedValue({ ok: false, reason: 'unavailable' })

    expect((await GET(request(`?candidate=${CANDIDATE}`))).status).toBe(503)
  })
})
