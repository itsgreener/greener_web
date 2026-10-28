// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ID = '0b1f1a52-3b8e-4a0e-9c1d-5d4e6f7a8b9c'

const search = vi.hoisted(() => vi.fn())
const statusCounts = vi.hoisted(() => vi.fn())
const detail = vi.hoisted(() => vi.fn())
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
)
const uploadStaffCvAction = vi.hoisted(() => vi.fn())
const processPendingCvsAction = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ notFound, redirect: vi.fn() }))

const requireAdminPage = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth/adminSession', () => ({ requireAdminPage }))

vi.mock('@/modules/talent/container', () => ({
  talentAdminQueries: { search, statusCounts, detail },
}))

vi.mock('@/app/admin/(panel)/talent/actions', () => ({
  uploadStaffCvAction,
  processPendingCvsAction,
  reprocessCandidateAction: vi.fn(),
  resendFormLinkAction: vi.fn(),
  deleteCandidateAction: vi.fn(),
}))

import AdminTalentCandidatePage from '@/app/admin/(panel)/talent/[id]/page'
import AdminTalentPage from '@/app/admin/(panel)/talent/page'
import UploadCvs from '@/app/admin/(panel)/talent/upload/UploadCvs'

const ITEM = {
  id: ID,
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  status: 'closed',
  profile: ['diseno', 'Ilustración 3D'],
  cvKind: 'drive',
  filesCount: 2,
  uploadedBy: 'ana@itsgreener.com',
  createdAt: '2026-06-01T10:00:00Z',
}

async function renderList(params: Record<string, string> = {}) {
  render(await AdminTalentPage({ searchParams: Promise.resolve(params) }))
}

describe('/admin/talent — listado', () => {
  beforeEach(() => {
    search.mockReset().mockResolvedValue({ items: [ITEM], total: 1018 })
    statusCounts.mockReset().mockResolvedValue({ closed: 19, sent: 914 })
  })

  it('lista candidatos con perfil, estado, tipo de CV y enlace a la ficha', async () => {
    await renderList()

    expect(screen.getByText('1018 candidatos')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('Diseño, Ilustración 3D')).toBeInTheDocument()
    expect(
      screen.getByText('Subido por ana@itsgreener.com'),
    ).toBeInTheDocument()
    expect(screen.getByText('+2 ficheros')).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: /Ada Lovelace/ })[0],
    ).toHaveAttribute('href', `/admin/talent/${ID}`)
  })

  it('tras eliminar un candidato avisa de lo que queda por borrar a mano', async () => {
    await renderList({ deleted: '1', drive: '1', newsletter: '1' })

    const notice = screen.getByRole('status')

    expect(notice).toHaveTextContent('Candidato eliminado')
    expect(notice).toHaveTextContent('su CV en Google Drive')
    expect(notice).toHaveTextContent('su suscripción en Mailchimp')
  })

  it('el aviso de eliminación no menciona pendientes si no los hay', async () => {
    await renderList({ deleted: '1' })

    const notice = screen.getByRole('status')

    expect(notice).toHaveTextContent('Candidato eliminado')
    expect(notice).not.toHaveTextContent('Quedan por quitar a mano')
  })

  it('sin el parámetro no hay aviso', async () => {
    await renderList()

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('el CV se abre por la ruta que deja constancia, nunca por un enlace directo', async () => {
    await renderList()

    const link = screen.getByRole('link', { name: /Drive/ })

    expect(link).toHaveAttribute('href', `/api/admin/talent/cv?candidate=${ID}`)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(document.body.innerHTML).not.toContain('drive.google.com')
  })

  it('un candidato sin procesar se enseña como tal y sin CV no hay enlace', async () => {
    search.mockResolvedValue({
      items: [
        {
          ...ITEM,
          name: null,
          email: null,
          status: 'pending',
          profile: [],
          cvKind: 'none',
          filesCount: 0,
          uploadedBy: null,
          createdAt: null,
        },
      ],
      total: 1,
    })

    await renderList()

    expect(screen.getByText('Sin procesar')).toBeInTheDocument()
    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')

    expect(hrefs.some((href) => href.startsWith('/api/admin/talent/cv'))).toBe(
      false,
    )
  })

  it('pasa la consulta saneada al repositorio', async () => {
    await renderList({
      q: 'ada%_',
      status: 'error',
      profile: 'video',
      page: '3',
    })

    expect(search).toHaveBeenCalledWith({
      q: 'ada',
      status: 'error',
      profile: 'video',
      page: 3,
      pageSize: 25,
    })
  })

  it('contadores por estado que filtran y paginación que conserva los filtros', async () => {
    await renderList({ status: 'closed', page: '2' })

    expect(screen.getByRole('link', { name: /Completado 19/ })).toHaveAttribute(
      'href',
      '/admin/talent?status=closed',
    )
    expect(screen.getByRole('link', { name: /Siguiente/ })).toHaveAttribute(
      'href',
      '/admin/talent?status=closed&page=3',
    )
    expect(screen.getByRole('link', { name: /Anterior/ })).toHaveAttribute(
      'href',
      '/admin/talent?status=closed',
    )
  })

  it('con pendientes o procesando enseña el panel de lanzar el procesado', async () => {
    statusCounts.mockResolvedValue({ pending: 3, started: 1 })

    await renderList()

    expect(
      screen.getByText(/3 CVs pendientes de procesar y 1 en/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Procesar pendientes' }),
    ).toBeEnabled()
  })

  it('sin pendientes ni procesando no hay panel', async () => {
    await renderList()

    expect(
      screen.queryByRole('button', { name: 'Procesar pendientes' }),
    ).toBeNull()
  })

  it('si Supabase-talent no responde, avisa en vez de dar un error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    search.mockRejectedValue(new Error('caído'))

    await renderList()

    expect(
      screen.getByText(/No se ha podido leer Supabase-talent/),
    ).toBeInTheDocument()
    expect(log).toHaveBeenCalled()
  })

  it('sin resultados lo dice, distinguiendo si hay filtros', async () => {
    search.mockResolvedValue({ items: [], total: 0 })

    await renderList({ q: 'nadie' })

    expect(screen.getByText('Sin resultados')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Limpiar' })).toBeInTheDocument()
  })
})

const DETAIL = {
  id: ID,
  status: 'started',
  createdAt: '2026-06-01T10:00:00Z',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+34 600 000 000',
  comment: 'Me gustaría colaborar',
  aiComment: 'Perfil sólido',
  profile: ['diseno'],
  experience: '5-10',
  workTypes: ['freelance', 'fulltime'],
  rateDay: 300,
  rateHour: null,
  languages: { English: 'avanzado', Castellano: 'nativo' },
  socials: {
    LinkedIn: 'https://linkedin.com/in/ada',
    Raro: 'javascript:alert(1)',
  },
  newsletterAccepted: true,
  uploadedBy: null,
  blocked: null,
  cvKind: 'bucket',
  cvName: 'resume-ada.pdf',
  projects: [
    { link: 'https://ada.example/portfolio', comment: 'Mi portfolio' },
    { link: 'javascript:alert(2)', comment: null },
  ],
  files: [
    {
      id: 'f1',
      type: 'portfolio',
      status: 'processed',
      kind: 'drive',
      createdAt: null,
    },
    { id: 'f2', type: null, status: null, kind: 'none', createdAt: null },
  ],
}

async function renderDetail(id = ID) {
  render(await AdminTalentCandidatePage({ params: Promise.resolve({ id }) }))
}

describe('/admin/talent/[id] — ficha', () => {
  beforeEach(() => {
    detail.mockReset().mockResolvedValue(DETAIL)
    notFound.mockClear()
  })

  it('enseña los datos con etiquetas legibles', async () => {
    await renderDetail()

    expect(
      screen.getByRole('heading', { name: 'Ada Lovelace' }),
    ).toBeInTheDocument()
    expect(screen.getByText('5 a 10 años')).toBeInTheDocument()
    expect(screen.getByText('Freelance, Jornada completa')).toBeInTheDocument()
    expect(screen.getByText('300 € / día')).toBeInTheDocument()
    expect(
      screen.getByText('English (Avanzado), Castellano (Nativo)'),
    ).toBeInTheDocument()
    expect(screen.getByText('Perfil sólido')).toBeInTheDocument()
  })

  it('no enseña el token ni rutas internas', async () => {
    await renderDetail()

    expect(document.body.innerHTML).not.toMatch(/access_token|accessToken/)
    expect(document.body.innerHTML).not.toContain('uploads/')
  })

  it('solo enlaza URLs http(s): un javascript: de la base se queda como texto', async () => {
    await renderDetail()

    const hrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href') ?? '')

    expect(hrefs.some((href) => href.startsWith('javascript:'))).toBe(false)
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      'https://linkedin.com/in/ada',
    )
    expect(screen.getByText('Raro')).not.toHaveAttribute('href')
  })

  it('los enlaces externos llevan noopener y nofollow', async () => {
    await renderDetail()

    expect(
      screen.getByRole('link', { name: 'LinkedIn' }).getAttribute('rel'),
    ).toBe('noopener noreferrer nofollow')
  })

  it('el CV y los ficheros se abren por la ruta que deja constancia', async () => {
    await renderDetail()

    expect(screen.getByRole('link', { name: /Ver CV/ })).toHaveAttribute(
      'href',
      `/api/admin/talent/cv?candidate=${ID}`,
    )
    expect(screen.getByRole('link', { name: /^portfolio/ })).toHaveAttribute(
      'href',
      `/api/admin/talent/cv?candidate=${ID}&file=f1`,
    )
    expect(screen.getByText('Sin enlace')).toBeInTheDocument()
  })

  it('"Reprocesar" solo en started/error con el CV aún en el bucket', async () => {
    await renderDetail()

    expect(
      screen.getByRole('button', { name: 'Reprocesar CV' }),
    ).toBeInTheDocument()
  })

  it.each([
    ['closed', 'bucket'],
    ['started', 'drive'],
    ['pending', 'bucket'],
  ])('sin "Reprocesar" con estado %s y CV en %s', async (status, cvKind) => {
    detail.mockResolvedValue({ ...DETAIL, status, cvKind })

    await renderDetail()

    expect(screen.queryByRole('button', { name: 'Reprocesar CV' })).toBeNull()
  })

  it('"Reenviar enlace" no sale si n8n procesa la fila ni si no hay email', async () => {
    detail.mockResolvedValue({ ...DETAIL, status: 'pending' })
    await renderDetail()
    expect(screen.queryByRole('button', { name: /Reenviar enlace/ })).toBeNull()
  })

  it('sin email tampoco', async () => {
    detail.mockResolvedValue({ ...DETAIL, status: 'sent', email: null })
    await renderDetail()
    expect(screen.queryByRole('button', { name: /Reenviar enlace/ })).toBeNull()
  })

  it('con email y estado normal, sí', async () => {
    detail.mockResolvedValue({ ...DETAIL, status: 'sent' })
    await renderDetail()
    expect(
      screen.getByRole('button', { name: 'Reenviar enlace del formulario' }),
    ).toBeInTheDocument()
  })

  it('un id que no es uuid o un candidato que no existe son 404', async () => {
    await expect(renderDetail('no-es-uuid')).rejects.toThrow('NEXT_NOT_FOUND')
    expect(detail).not.toHaveBeenCalled()

    detail.mockResolvedValue(null)
    await expect(renderDetail()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('«Eliminar candidato» sale siempre y pide confirmación', async () => {
    await renderDetail()

    expect(
      screen.getByRole('button', { name: 'Eliminar candidato' }),
    ).toBeInTheDocument()
  })

  it('enlaza con su historial en Actividad', async () => {
    await renderDetail()

    expect(screen.getByRole('link', { name: 'Ver actividad' })).toHaveAttribute(
      'href',
      `/admin/audit?entity=talent_candidate&entityId=${ID}`,
    )
  })
})

function pdf(name = 'cv.pdf', size = 10) {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' })
}

function choose(files: File[]) {
  fireEvent.change(screen.getByLabelText(/Elige los CVs/), {
    target: { files },
  })
}

describe('subida de CVs — navegador', () => {
  beforeEach(() => {
    uploadStaffCvAction.mockReset().mockResolvedValue({ ok: true })
    processPendingCvsAction
      .mockReset()
      .mockResolvedValue({ message: 'Procesado lanzado para 2 CVs.' })
  })

  it('descarta en el navegador lo que no admite el servidor', () => {
    render(<UploadCvs />)

    choose([
      pdf('bueno.pdf'),
      pdf('virus.exe'),
      pdf('grande.pdf', 3_500_001),
      pdf('vacio.pdf', 0),
    ])

    expect(screen.getByText('bueno.pdf')).toBeInTheDocument()
    expect(screen.queryByText('virus.exe')).toBeNull()
    expect(
      screen.getByText(/virus.exe: formato no admitido/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/grande.pdf: supera los 3,5 MB/),
    ).toBeInTheDocument()
    expect(screen.getByText(/vacio.pdf: está vacío/)).toBeInTheDocument()
  })

  it('no admite más de 10 por lote', () => {
    render(<UploadCvs />)

    choose(Array.from({ length: 12 }, (_, index) => pdf(`cv-${index}.pdf`)))

    expect(screen.getAllByText(/ MB · listo/)).toHaveLength(10)
    expect(screen.getByText(/Solo caben 10 CVs por vez/)).toBeInTheDocument()
  })

  it('sube un fichero por llamada y lanza el procesado UNA vez al final', async () => {
    render(<UploadCvs />)

    choose([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')])

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Subir y procesar 3' }),
      )
    })

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    expect(uploadStaffCvAction).toHaveBeenCalledTimes(3)
    expect(processPendingCvsAction).toHaveBeenCalledTimes(1)
    expect(uploadStaffCvAction.mock.invocationCallOrder[2]).toBeLessThan(
      processPendingCvsAction.mock.invocationCallOrder[0],
    )
    expect(screen.getByText('3 subidos.')).toBeInTheDocument()
    expect(
      screen.getByText('Procesado lanzado para 2 CVs.'),
    ).toBeInTheDocument()
  })

  it('si uno falla, se dice cuál y por qué, y el resto sigue', async () => {
    uploadStaffCvAction
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        error: 'el antivirus no lo ha dado por limpio.',
      })

    render(<UploadCvs />)

    choose([pdf('a.pdf'), pdf('b.pdf')])

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Subir y procesar 2' }),
      )
    })

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    expect(screen.getByText('1 subidos, 1 con error.')).toBeInTheDocument()
    expect(
      screen.getByText(
        /no se ha subido: el antivirus no lo ha dado por limpio/,
      ),
    ).toBeInTheDocument()
    expect(processPendingCvsAction).toHaveBeenCalledTimes(1)
  })

  it('si no se sube ninguno, no se lanza el procesado', async () => {
    uploadStaffCvAction.mockResolvedValue({ ok: false, error: 'no.' })

    render(<UploadCvs />)

    choose([pdf('a.pdf')])

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Subir y procesar 1' }),
      )
    })

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    expect(processPendingCvsAction).not.toHaveBeenCalled()
    expect(screen.getByText('No se ha subido ningún CV.')).toBeInTheDocument()
  })

  it('una conexión cortada cuenta como error de ese fichero, no rompe el lote', async () => {
    uploadStaffCvAction.mockRejectedValueOnce(new Error('network'))

    render(<UploadCvs />)

    choose([pdf('a.pdf'), pdf('b.pdf')])

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Subir y procesar 2' }),
      )
    })

    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())

    expect(screen.getByText(/se ha cortado la conexión/)).toBeInTheDocument()
    expect(uploadStaffCvAction).toHaveBeenCalledTimes(2)
  })

  it('sin ficheros el botón está desactivado', () => {
    render(<UploadCvs />)

    expect(
      screen.getByRole('button', { name: 'Subir y procesar' }),
    ).toBeDisabled()
  })
})
