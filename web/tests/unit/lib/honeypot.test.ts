import { describe, expect, it } from 'vitest'

import { readHoneypot } from '@/lib/forms/honeypot'

describe('readHoneypot', () => {
  it('devuelve el valor del campo', () => {
    const form = new FormData()
    form.set('website', 'http://spam.example')

    expect(readHoneypot(form, 'website')).toBe('http://spam.example')
  })

  it('campo ausente: cadena vacía', () => {
    expect(readHoneypot(new FormData(), 'website')).toBe('')
  })

  it('campo vacío (una persona real): cadena vacía', () => {
    const form = new FormData()
    form.set('company', '')

    expect(readHoneypot(form, 'company')).toBe('')
  })

  it('un archivo no es un texto: cadena vacía', () => {
    const form = new FormData()
    form.set('website', new File(['x'], 'x.txt'))

    expect(readHoneypot(form, 'website')).toBe('')
  })

  it('solo lee el campo que se pide', () => {
    const form = new FormData()
    form.set('company', 'bot')

    expect(readHoneypot(form, 'website')).toBe('')
  })
})
