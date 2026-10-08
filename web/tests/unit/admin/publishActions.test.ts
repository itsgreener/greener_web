import { describe, it, expect, vi, beforeEach } from 'vitest'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

vi.mock('@/modules/media/application/warmAfterResponse', () => ({
  warmContentAfterResponse: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/content/application/publishContent', () => ({
  publishContent: vi.fn(),
}))

vi.mock('@/modules/content/application/scheduleContent', () => ({
  scheduleContent: vi.fn(),
}))

vi.mock('@/modules/content/application/unpublishContent', () => ({
  unpublishContent: vi.fn(),
}))

function formData(entries: Record<string, string>) {
  const data = new FormData()

  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value)
  }

  return data
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('publishContentAction', () => {
  it('con un id válido, publica y devuelve success', async () => {
    const { publishContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { publishContent } =
      await import('@/modules/content/application/publishContent')

    vi.mocked(publishContent).mockResolvedValue(CONTENT_ID)

    const result = await publishContentAction({}, formData({ id: CONTENT_ID }))

    expect(result.success).toBe(true)
    expect(publishContent).toHaveBeenCalledWith({ id: CONTENT_ID })

    const { warmContentAfterResponse } =
      await import('@/modules/media/application/warmAfterResponse')

    expect(warmContentAfterResponse).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('con un id inválido, no llega a llamar a publishContent', async () => {
    const { publishContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { publishContent } =
      await import('@/modules/content/application/publishContent')

    const result = await publishContentAction({}, formData({ id: 'malo' }))

    expect(result.error).toBeTruthy()
    expect(publishContent).not.toHaveBeenCalled()
  })

  it('si publicar falla, no se calienta nada', async () => {
    const { publishContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { publishContent } =
      await import('@/modules/content/application/publishContent')
    const { warmContentAfterResponse } =
      await import('@/modules/media/application/warmAfterResponse')

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(publishContent).mockRejectedValue(new Error('boom'))

    await publishContentAction({}, formData({ id: CONTENT_ID }))

    expect(warmContentAfterResponse).not.toHaveBeenCalled()
  })

  it('si publishContent lanza, devuelve un error legible', async () => {
    const { publishContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { publishContent } =
      await import('@/modules/content/application/publishContent')

    vi.mocked(publishContent).mockRejectedValue(new Error('Content not found'))

    const result = await publishContentAction({}, formData({ id: CONTENT_ID }))

    expect(result.error).toBeTruthy()
  })

  it('decisión del 22 sep: sin html_package publicado, traduce el error del RPC a un mensaje específico, no el genérico', async () => {
    const { publishContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { publishContent } =
      await import('@/modules/content/application/publishContent')

    vi.mocked(publishContent).mockRejectedValue(
      new Error(
        'Esta tool/insight no tiene un paquete HTML publicado — no se puede publicar sin él',
      ),
    )

    const result = await publishContentAction({}, formData({ id: CONTENT_ID }))

    expect(result.error).toContain('paquete HTML')
  })
})

describe('scheduleContentAction', () => {
  it('con una fecha futura válida, programa y devuelve success', async () => {
    const { scheduleContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { scheduleContent } =
      await import('@/modules/content/application/scheduleContent')

    vi.mocked(scheduleContent).mockResolvedValue(CONTENT_ID)

    const future = new Date(Date.now() + 3_600_000).toISOString()

    const result = await scheduleContentAction(
      {},
      formData({ id: CONTENT_ID, publishAt: future }),
    )

    expect(result.success).toBe(true)
    expect(scheduleContent).toHaveBeenCalledOnce()

    const { warmContentAfterResponse } =
      await import('@/modules/media/application/warmAfterResponse')

    expect(warmContentAfterResponse).toHaveBeenCalledWith(CONTENT_ID)
  })

  it('con una fecha pasada, el schema la rechaza sin llamar a scheduleContent', async () => {
    const { scheduleContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { scheduleContent } =
      await import('@/modules/content/application/scheduleContent')

    const past = new Date(Date.now() - 3_600_000).toISOString()

    const result = await scheduleContentAction(
      {},
      formData({ id: CONTENT_ID, publishAt: past }),
    )

    expect(result.fieldErrors?.publishAt?.[0]).toBeTruthy()
    expect(scheduleContent).not.toHaveBeenCalled()
  })

  it('si scheduleContent lanza el error de fecha futura del SQL, lo traduce a fieldErrors.publishAt', async () => {
    const { scheduleContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { scheduleContent } =
      await import('@/modules/content/application/scheduleContent')

    vi.mocked(scheduleContent).mockRejectedValue(
      new Error('La fecha de publicación debe ser futura'),
    )

    const future = new Date(Date.now() + 3_600_000).toISOString()

    const result = await scheduleContentAction(
      {},
      formData({ id: CONTENT_ID, publishAt: future }),
    )

    expect(result.fieldErrors?.publishAt?.[0]).toBeTruthy()
  })

  it('decisión del 22 sep: sin html_package publicado, traduce el error del RPC a formError específico', async () => {
    const { scheduleContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { scheduleContent } =
      await import('@/modules/content/application/scheduleContent')

    vi.mocked(scheduleContent).mockRejectedValue(
      new Error(
        'Esta tool/insight no tiene un paquete HTML publicado — no se puede programar sin él',
      ),
    )

    const future = new Date(Date.now() + 3_600_000).toISOString()

    const result = await scheduleContentAction(
      {},
      formData({ id: CONTENT_ID, publishAt: future }),
    )

    expect(result.formError).toContain('paquete HTML')
  })
})

describe('unpublishContentAction', () => {
  it('con un id válido, despublica y devuelve success', async () => {
    const { unpublishContentAction } =
      await import('@/app/admin/contents/[id]/edit/publishActions')
    const { unpublishContent } =
      await import('@/modules/content/application/unpublishContent')

    vi.mocked(unpublishContent).mockResolvedValue(CONTENT_ID)

    const result = await unpublishContentAction(
      {},
      formData({ id: CONTENT_ID }),
    )

    expect(result.success).toBe(true)
    expect(unpublishContent).toHaveBeenCalledWith({ id: CONTENT_ID })
  })
})
