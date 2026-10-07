import { describe, expect, it } from 'vitest'

import {
  ratioFromFilename,
  ratioMismatchMessage,
} from '@/modules/media/domain/ratioFromFilename'

describe('ratioFromFilename — convención nombre-proporción-tipo.ext', () => {
  it.each([
    ['flap-1x1-img.jpg', '1:1'],
    ['flap-4x3-img.jpg', '4:3'],
    ['flap-4x5-video.mp4', '4:5'],
    ['flap-3x4-img.png', '3:4'],
    ['flap-2x3-img.webp', '2:3'],
    ['flap-9x16-video.webm', '9:16'],
    ['flap-16x9-video.mov', '16:9'],
  ])('lee la forma con x: %s → %s', (name, expected) => {
    expect(ratioFromFilename(name)).toBe(expected)
  })

  it.each([
    ['flap-11-img.jpg', '1:1'],
    ['flap-43-img.jpg', '4:3'],
    ['flap-45-img.jpg', '4:5'],
    ['flap-34-img.jpg', '3:4'],
    ['flap-23-img.jpg', '2:3'],
    ['flap-916-video.mp4', '9:16'],
    ['flap-169-video.mp4', '16:9'],
  ])(
    'lee la forma compacta en la posición de la convención: %s → %s',
    (name, expected) => {
      expect(ratioFromFilename(name)).toBe(expected)
    },
  )

  it('no distingue mayúsculas ni el signo ×', () => {
    expect(ratioFromFilename('Flap-1X1-Img.JPG')).toBe('1:1')
    expect(ratioFromFilename('flap-16×9-video.mp4')).toBe('16:9')
  })

  it('un nombre con guiones bajos, espacios o varios bloques también vale', () => {
    expect(ratioFromFilename('caso-brand-the-future-4x5-img.jpg')).toBe('4:5')
    expect(ratioFromFilename('caso_brand_45_img.jpg')).toBe('4:5')
    expect(ratioFromFilename('caso brand 9x16 video.mp4')).toBe('9:16')
  })

  it('un número del nombre no se confunde con la proporción compacta', () => {
    expect(ratioFromFilename('caso-11-1x1-img.jpg')).toBe('1:1')
    expect(ratioFromFilename('caso-11-hero.jpg')).toBe('1:1') // posición de la convención
    expect(ratioFromFilename('caso-11.jpg')).toBeNull()
    expect(ratioFromFilename('2023-campana-img.jpg')).toBeNull()
  })

  it.each([
    ['elonmuskeizer-43-image-2.webp', '4:3'],
    ['elonmuskeizer-43-image-12.webp', '4:3'],
    ['flap-4x5-img-2.jpg', '4:5'],
    ['flap-916-video_3.mp4', '9:16'],
    ['flap-169-video-2-3.mp4', '16:9'],
    ['flap 45 img (2).jpg', '4:5'],
    ['flap-1x1-2.jpg', '1:1'],
  ])('ignora el contador numérico del final: %s → %s', (name, expected) => {
    expect(ratioFromFilename(name)).toBe(expected)
  })

  it('el contador no hace que se lea como proporción un número del nombre', () => {
    expect(ratioFromFilename('caso-11-hero-2.jpg')).toBe('1:1') // posición de la convención
    expect(ratioFromFilename('2023-campana-img-2.jpg')).toBeNull()
    expect(ratioFromFilename('flap-img-2.jpg')).toBeNull()
  })

  it('sin la parte de tipo, solo se acepta la forma explícita', () => {
    expect(ratioFromFilename('flap-1x1.jpg')).toBe('1:1')
    expect(ratioFromFilename('flap-45.jpg')).toBeNull()
  })

  it('devuelve null si no hay proporción legible', () => {
    expect(ratioFromFilename('flap.jpg')).toBeNull()
    expect(ratioFromFilename('flap-img.jpg')).toBeNull()
    expect(ratioFromFilename('IMG_2034.jpg')).toBeNull()
    expect(ratioFromFilename('')).toBeNull()
  })

  it('devuelve null si la proporción no es una de las 7 cerradas', () => {
    expect(ratioFromFilename('flap-5x7-img.jpg')).toBeNull()
    expect(ratioFromFilename('flap-57-img.jpg')).toBeNull()
    expect(ratioFromFilename('flap-21x9-img.jpg')).toBeNull()
    expect(ratioFromFilename('flap-0x0-img.jpg')).toBeNull()
  })
})

describe('ratioMismatchMessage — aviso si el ratio no encaja con el archivo', () => {
  it('no avisa cuando encaja (dentro de la tolerancia)', () => {
    expect(ratioMismatchMessage('1:1', 1080, 1080, 'filename')).toBeNull()
    expect(ratioMismatchMessage('4:5', 1080, 1350, 'filename')).toBeNull()
    expect(ratioMismatchMessage('16:9', 1920, 1080, 'other')).toBeNull()
  })

  it('avisa citando el nombre del archivo y sugiere el ratio real', () => {
    const message = ratioMismatchMessage('4:5', 1080, 1080, 'filename')

    expect(message).toContain('El nombre del archivo indica 4:5')
    expect(message).toContain('1080×1080')
    expect(message).toContain('1:1')
  })

  it('con otro origen usa el texto genérico del pin', () => {
    const message = ratioMismatchMessage('4:5', 1080, 1080, 'other')

    expect(message).toContain('no es el del pin (4:5)')
    expect(message).not.toContain('nombre del archivo')
  })

  it('no inventa avisos con ratios o dimensiones inválidos', () => {
    expect(ratioMismatchMessage('5:7', 100, 100, 'filename')).toBeNull()
    expect(ratioMismatchMessage('1:1', 100, 0, 'filename')).toBeNull()
  })
})
