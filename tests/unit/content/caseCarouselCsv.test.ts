import { describe, expect, it } from 'vitest'

import {
  findCarouselCsvRow,
  parseCarouselCsv,
  reportCarouselCsv,
} from '@/modules/content/domain/caseCarouselCsv'

describe('parseCarouselCsv', () => {
  it('lee filename y alt', () => {
    const rows = parseCarouselCsv(
      [
        'filename,alt',
        'slide-1.jpg,Founders at the pistachio orchard',
        'slide-2.jpg,"Harvest, close-up of the nuts"',
      ].join('\n'),
    )

    expect(rows).toEqual([
      { filename: 'slide-1.jpg', alt: 'Founders at the pistachio orchard' },
      { filename: 'slide-2.jpg', alt: 'Harvest, close-up of the nuts' },
    ])
  })

  it('acepta el punto y coma de Excel y el BOM', () => {
    const rows = parseCarouselCsv(
      '﻿filename;alt\nslide-1.jpg;An orchard, at dawn',
    )

    expect(rows).toEqual([
      { filename: 'slide-1.jpg', alt: 'An orchard, at dawn' },
    ])
  })

  it('sirve el CSV de los pines: ignora label, ratio e idioma', () => {
    const rows = parseCarouselCsv(
      [
        'filename,label,ratio,language,alt',
        'slide-1.jpg,Gancho,4:5,en,An orchard',
      ].join('\n'),
    )

    expect(rows).toEqual([{ filename: 'slide-1.jpg', alt: 'An orchard' }])
  })

  it('sin columna alt, las filas no llevan alt', () => {
    expect(parseCarouselCsv('filename\nslide-1.jpg')).toEqual([
      { filename: 'slide-1.jpg' },
    ])
  })

  it('descarta las filas sin nombre de archivo y no lee nada sin esa columna', () => {
    expect(parseCarouselCsv('filename,alt\n,Sin archivo\na.jpg,A')).toEqual([
      { filename: 'a.jpg', alt: 'A' },
    ])
    expect(parseCarouselCsv('archivo,alt\na.jpg,A')).toEqual([])
    expect(parseCarouselCsv('')).toEqual([])
  })
})

describe('findCarouselCsvRow', () => {
  const rows = parseCarouselCsv(
    ['filename,alt', 'Café-1.JPG,Primera', 'café-1.jpg,Repetida'].join('\n'),
  )

  it('empareja sin distinguir mayúsculas ni la forma Unicode de la tilde', () => {
    expect(findCarouselCsvRow(rows, 'café-1.jpg')?.alt).toBe('Primera')
    expect(findCarouselCsvRow(rows, 'café-1.jpg')?.alt).toBe('Primera')
  })

  it('con un nombre repetido gana la primera fila', () => {
    expect(findCarouselCsvRow(rows, 'CAFÉ-1.JPG')?.alt).toBe('Primera')
  })

  it('sin fila para ese archivo, undefined', () => {
    expect(findCarouselCsvRow(rows, 'otra.jpg')).toBeUndefined()
  })
})

describe('reportCarouselCsv', () => {
  const rows = parseCarouselCsv(
    ['filename,alt', 'a.jpg,A', 'b.jpg,B', 'typo.jpg,T'].join('\n'),
  )

  it('separa las filas sin archivo de los archivos sin fila', () => {
    expect(reportCarouselCsv(rows, ['a.jpg', 'B.JPG', 'c.jpg'])).toEqual({
      unmatchedCsvNames: ['typo.jpg'],
      filesWithoutRow: ['c.jpg'],
    })
  })

  it('todo encaja: nada que avisar', () => {
    expect(reportCarouselCsv(rows, ['a.jpg', 'b.jpg', 'typo.jpg'])).toEqual({
      unmatchedCsvNames: [],
      filesWithoutRow: [],
    })
  })
})
