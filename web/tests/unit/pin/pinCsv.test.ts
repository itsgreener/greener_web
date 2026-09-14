import { describe, it, expect } from 'vitest'

import { parsePinCsv, findCsvRowForFile } from '@/modules/pin/domain/pinCsv'

describe('parsePinCsv', () => {
  it('parsea una cabecera y varias filas', () => {
    const csv = [
      'filename,label,ratio,language,alt,queueOrder',
      'foto1.jpg,Pistachos de temporada,1:1,es,Cosecha de pistachos,0',
      'foto2.jpg,Cosecha,4:5,es,Trabajadores en el campo,1',
    ].join('\n')

    const rows = parsePinCsv(csv)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      filename: 'foto1.jpg',
      label: 'Pistachos de temporada',
      ratio: '1:1',
      language: 'es',
      alt: 'Cosecha de pistachos',
      queueOrder: '0',
    })
  })

  it('acepta "queue_order" y "queueorder" como alias de la misma columna', () => {
    const csv1 = ['filename,queue_order', 'foto1.jpg,3'].join('\n')
    const csv2 = ['filename,queueorder', 'foto1.jpg,3'].join('\n')

    expect(parsePinCsv(csv1)[0].queueOrder).toBe('3')
    expect(parsePinCsv(csv2)[0].queueOrder).toBe('3')
  })

  it('ignora columnas desconocidas en vez de fallar', () => {
    const csv = [
      'filename,label,columna_rara',
      'foto1.jpg,Hola,lo-que-sea',
    ].join('\n')

    const rows = parsePinCsv(csv)

    expect(rows[0]).toEqual({ filename: 'foto1.jpg', label: 'Hola' })
  })

  it('respeta comillas dobles con comas dentro del campo', () => {
    const csv = [
      'filename,label',
      '"foto1.jpg","Pistachos, avellanas y almendras"',
    ].join('\n')

    const rows = parsePinCsv(csv)

    expect(rows[0].label).toBe('Pistachos, avellanas y almendras')
  })

  it('respeta comillas dobles escapadas ("")', () => {
    const csv = ['filename,label', '"foto1.jpg","Dice ""hola"""'].join('\n')

    const rows = parsePinCsv(csv)

    expect(rows[0].label).toBe('Dice "hola"')
  })

  it('descarta filas sin filename', () => {
    const csv = [
      'filename,label',
      ',Sin archivo',
      'foto1.jpg,Con archivo',
    ].join('\n')

    const rows = parsePinCsv(csv)

    expect(rows).toHaveLength(1)
    expect(rows[0].filename).toBe('foto1.jpg')
  })

  it('ignora líneas en blanco', () => {
    const csv = ['filename,label', '', 'foto1.jpg,Hola', ''].join('\n')

    expect(parsePinCsv(csv)).toHaveLength(1)
  })

  it('devuelve un array vacío para un CSV vacío', () => {
    expect(parsePinCsv('')).toEqual([])
  })

  it('la cabecera no distingue mayúsculas/minúsculas', () => {
    const csv = ['FileName,Label', 'foto1.jpg,Hola'].join('\n')

    const rows = parsePinCsv(csv)

    expect(rows[0].filename).toBe('foto1.jpg')
    expect(rows[0].label).toBe('Hola')
  })
})

describe('findCsvRowForFile', () => {
  const rows = parsePinCsv(
    ['filename,label', 'Foto1.JPG,Uno', 'foto2.jpg,Dos'].join('\n'),
  )

  it('empareja por nombre de archivo exacto, sin distinguir mayúsculas', () => {
    expect(findCsvRowForFile(rows, 'foto1.jpg')?.label).toBe('Uno')
    expect(findCsvRowForFile(rows, 'FOTO2.JPG')?.label).toBe('Dos')
  })

  it('devuelve undefined si no hay fila para ese archivo', () => {
    expect(findCsvRowForFile(rows, 'foto3.jpg')).toBeUndefined()
  })
})
