import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/contact/container', () => ({
  submitContactForm: vi.fn(),
}))

import { submitContactAction } from '@/app/(public)/contact/contactActions'
import { submitContactForm } from '@/modules/contact/container'

const mockSubmit = vi.mocked(submitContactForm)

function form(entries: Record<string, string>) {
  const data = new FormData()
  for (const [k, v] of Object.entries(entries)) data.set(k, v)
  return data
}

const base = {
  name: 'Ada',
  phone: '600000000',
  email: 'ada@example.com',
  message: 'Hola, quiero hablar de un proyecto.',
}

beforeEach(() => vi.clearAllMocks())

describe('submitContactAction · valores devueltos', () => {
  it('si el envío falla, devuelve lo escrito para que el formulario no se vacíe', async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: false,
      formError: "We couldn't send your message. Please try again.",
    })

    const state = await submitContactAction({}, form(base))

    expect(state.formError).toBeDefined()
    expect(state.values).toEqual(base)
  })

  it('con errores de campo, también devuelve lo escrito', async () => {
    mockSubmit.mockResolvedValueOnce({
      ok: false,
      fieldErrors: { email: ["Email isn't valid"] },
    })

    const state = await submitContactAction(
      {},
      form({ ...base, email: 'no-es-un-email' }),
    )

    expect(state.fieldErrors?.email).toEqual(["Email isn't valid"])
    expect(state.values?.email).toBe('no-es-un-email')
    expect(state.values?.message).toBe(base.message)
  })

  it('en éxito no devuelve nada de lo escrito', async () => {
    mockSubmit.mockResolvedValueOnce({ ok: true })

    expect(await submitContactAction({}, form(base))).toEqual({ success: true })
  })

  it('recorta lo devuelto a la longitud máxima de cada campo y trata un campo ausente como vacío', async () => {
    mockSubmit.mockResolvedValueOnce({ ok: false, formError: 'x' })
    const data = form({ ...base, message: 'a'.repeat(9000) })
    data.delete('phone')

    const state = await submitContactAction({}, data)

    expect(state.values?.message).toHaveLength(5000)
    expect(state.values?.phone).toBe('')
  })
})

describe('submitContactAction · honeypot', () => {
  it('lee el señuelo del campo «reference_code»', async () => {
    mockSubmit.mockResolvedValueOnce({ ok: true })

    await submitContactAction({}, form({ ...base, reference_code: 'bot' }))

    expect(mockSubmit).toHaveBeenCalledWith(expect.anything(), 'bot')
  })

  it('un «website» relleno por el autorrelleno del navegador ya no cuenta como bot', async () => {
    mockSubmit.mockResolvedValueOnce({ ok: true })

    await submitContactAction(
      {},
      form({ ...base, website: 'https://autorrelleno.example' }),
    )

    expect(mockSubmit).toHaveBeenCalledWith(expect.anything(), '')
  })
})
