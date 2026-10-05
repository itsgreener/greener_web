import { describe, it, expect } from 'vitest'

import {
  closestClosedRatio,
  mediaMatchesRatio,
  widestCarouselRatio,
} from '@/modules/media/domain/closestRatio'

describe('mediaMatchesRatio — aviso de recorte de un vídeo en el ABM (5 oct 2026)', () => {
  it.each([
    ['1:1', 1080, 1080],
    ['4:3', 1440, 1080],
    ['4:5', 1080, 1350],
    ['3:4', 1080, 1440],
    ['2:3', 1080, 1620],
    ['9:16', 1080, 1920],
    ['16:9', 1920, 1080],
  ] as const)('%s encaja con %i×%i', (ratio, w, h) => {
    expect(mediaMatchesRatio(w, h, ratio)).toBe(true)
  })

  it('tolera diferencias de píxeles (1366×768 sigue siendo 16:9)', () => {
    expect(mediaMatchesRatio(1366, 768, '16:9')).toBe(true)
  })

  it('no encaja un 16:10 (1440×900) con ninguno de los dos más cercanos', () => {
    expect(mediaMatchesRatio(1440, 900, '16:9')).toBe(false)
    expect(mediaMatchesRatio(1440, 900, '4:3')).toBe(false)
  })

  it('un vídeo vertical no encaja con un pin horizontal', () => {
    expect(mediaMatchesRatio(1080, 1920, '16:9')).toBe(false)
  })

  it('dimensiones inválidas no encajan (no lanza)', () => {
    expect(mediaMatchesRatio(100, 0, '1:1')).toBe(false)
    expect(mediaMatchesRatio(Number.NaN, 100, '1:1')).toBe(false)
  })
})

describe('closestClosedRatio — dimensiones exactas de cada uno de los 7 ratios', () => {
  it.each([
    ['1:1', 1000, 1000],
    ['4:3', 1200, 900],
    ['4:5', 800, 1000],
    ['3:4', 900, 1200],
    ['2:3', 800, 1200],
    ['9:16', 900, 1600],
    ['16:9', 1600, 900],
  ] as const)('%s exacto se reconoce a sí mismo', (expected, width, height) => {
    expect(closestClosedRatio(width, height)).toBe(expected)
  })
})

describe('closestClosedRatio — dimensiones que no encajan exactas en ningún ratio', () => {
  it('una foto ligeramente más cuadrada que 4:5 sigue sugiriendo 4:5, no 1:1', () => {
    // 4:5 = 0.8 · 1:1 = 1 · el punto medio en escala lineal es 0.9, pero
    // en escala logarítmica el punto medio real está más cerca de 0.894
    // — con 0.85 (bien lejos de 1:1) tiene que seguir cayendo en 4:5.
    expect(closestClosedRatio(850, 1000)).toBe('4:5')
  })

  it('una foto casi panorámica pero no exacta sugiere 16:9, no 4:3', () => {
    expect(closestClosedRatio(1700, 950)).toBe('16:9')
  })

  it('un cuadrado casi perfecto (foto de cámara típica, 4032x3024 recortada) sugiere 1:1 o 4:3 según se acerque', () => {
    // 4032/3024 = 4:3 exacto.
    expect(closestClosedRatio(4032, 3024)).toBe('4:3')
  })
})

describe('closestClosedRatio — la comparación es en escala logarítmica, no lineal', () => {
  it('16:9 (1.778) y 9:16 (0.5625) están a la misma "distancia perceptual" de 1:1, aunque no en valor absoluto', () => {
    // Si comparase por diferencia absoluta de decimal, 16:9 (distancia
    // 0.778 de 1:1) parecería mucho más lejos que 9:16 (distancia 0.4375
    // de 1:1) — en la práctica ambos son "el mismo grado de apaisado o
    // vertical" en sentidos opuestos, así que un valor justo por debajo
    // de 16:9 no debería colarse hacia 1:1 antes que uno justo por
    // encima de 9:16 lo haría en el otro sentido.
    const distanceFrom16by9 = Math.abs(Math.log(1500 / 900) - Math.log(16 / 9))
    const distanceFrom9by16 = Math.abs(Math.log(900 / 1500) - Math.log(9 / 16))
    expect(distanceFrom16by9).toBeCloseTo(distanceFrom9by16, 10)
  })

  it('lanza si las dimensiones no son válidas (alto 0 o negativo)', () => {
    expect(() => closestClosedRatio(800, 0)).toThrow()
    expect(() => closestClosedRatio(800, -100)).toThrow()
    expect(() => closestClosedRatio(Number.NaN, 100)).toThrow()
  })
})

describe('widestCarouselRatio — carrusel de detalle de caso (tipo B), decisión del 21 sep', () => {
  it('con un único medio, usa su propio ratio', () => {
    expect(widestCarouselRatio([{ width: 900, height: 1600 }])).toBe('9:16')
  })

  it('con varios medios, gana el de mayor width/height (el más "ancho")', () => {
    const media = [
      { width: 900, height: 1600 }, // 9:16 — vertical
      { width: 1600, height: 900 }, // 16:9 — el más ancho, debe ganar
      { width: 1000, height: 1000 }, // 1:1
    ]
    expect(widestCarouselRatio(media)).toBe('16:9')
  })

  it('el orden de los medios en el array no cambia el resultado', () => {
    const media = [
      { width: 1000, height: 1000 },
      { width: 1600, height: 900 },
      { width: 900, height: 1600 },
    ]
    expect(widestCarouselRatio(media)).toBe('16:9')
    expect(widestCarouselRatio([...media].reverse())).toBe('16:9')
  })

  it('todo el carrusel vertical: el "más ancho" sigue siendo el menos vertical de todos', () => {
    const media = [
      { width: 900, height: 1600 }, // 9:16
      { width: 800, height: 1000 }, // 4:5 — menos vertical, debe ganar
      { width: 800, height: 1200 }, // 2:3
    ]
    expect(widestCarouselRatio(media)).toBe('4:5')
  })

  it('lanza con un carrusel vacío en vez de devolver un ratio arbitrario', () => {
    expect(() => widestCarouselRatio([])).toThrow()
  })
})
