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
