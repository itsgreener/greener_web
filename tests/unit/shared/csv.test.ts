import { describe, expect, it } from 'vitest'

import {
  normalizeFilename,
  parseCsvRecords,
  parseCsvTable,
} from '@/modules/shared/domain/csv'

describe('parseCsvTable', () => {
  it('lee filas separadas por coma', () => {
    expect(parseCsvTable('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('detecta el punto y coma de Excel con configuración regional española', () => {
    expect(
      parseCsvTable('filename;alt\nfoto.jpg;Una casa, con jardín'),
    ).toEqual([
      ['filename', 'alt'],
      ['foto.jpg', 'Una casa, con jardín'],
    ])
  })

  it('con comas y puntos y comas en la cabecera gana el más frecuente', () => {
    expect(parseCsvTable('a,b,c;d\n1,2,3;4')[0]).toEqual(['a', 'b', 'c;d'])
    expect(parseCsvTable('a;b;c,d\n1;2;3,4')[0]).toEqual(['a', 'b', 'c,d'])
  })

  it('los separadores entre comillas de la cabecera no cuentan', () => {
    expect(parseCsvTable('"a;b;c",d\n1,2')[0]).toEqual(['a;b;c', 'd'])
  })

  it('una sola columna vale con cualquier salto de línea', () => {
    expect(parseCsvTable('filename\r\na.jpg\rb.jpg\nc.jpg')).toEqual([
      ['filename'],
      ['a.jpg'],
      ['b.jpg'],
      ['c.jpg'],
    ])
  })

  it('quita el BOM de «CSV UTF-8»', () => {
    expect(parseCsvTable('﻿filename,alt\na.jpg,A')[0]).toEqual([
      'filename',
      'alt',
    ])
  })

  it('respeta comas, saltos de línea y comillas escapadas dentro de comillas', () => {
    const table = parseCsvTable(
      'filename,alt\n"a.jpg","Dice ""hola"",\nsegunda línea"\nb.jpg,B',
    )

    expect(table).toEqual([
      ['filename', 'alt'],
      ['a.jpg', 'Dice "hola",\nsegunda línea'],
      ['b.jpg', 'B'],
    ])
  })

  it('una comilla en mitad de un campo es literal y no se traga el resto', () => {
    expect(parseCsvTable('a,b\n5" de ancho,x\ny,z')).toEqual([
      ['a', 'b'],
      ['5" de ancho', 'x'],
      ['y', 'z'],
    ])
  })

  it('abre comillas tras un espacio: `, "texto, con coma"`', () => {
    expect(parseCsvTable('a,b\n1, "uno, dos"')[1]).toEqual(['1', ' uno, dos'])
  })

  it('descarta líneas en blanco y líneas solo con separadores', () => {
    expect(parseCsvTable('a,b\n\n,\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('el último registro vale sin salto de línea final', () => {
    expect(parseCsvTable('a,b\n1,2')).toHaveLength(2)
    expect(parseCsvTable('a,b\n1,2\n')).toHaveLength(2)
  })

  it('un texto vacío no tiene filas', () => {
    expect(parseCsvTable('')).toEqual([])
    expect(parseCsvTable('\n\n')).toEqual([])
  })
})

describe('parseCsvRecords', () => {
  const ALIASES = {
    filename: 'filename',
    lang: 'language',
    alt: 'alt',
  } as const

  it('mapea por alias, ignora columnas desconocidas y recorta los valores', () => {
    expect(
      parseCsvRecords(
        ' FileName , Lang ,raro,alt\n a.jpg , es ,x, Una casa ',
        ALIASES,
      ),
    ).toEqual([{ filename: 'a.jpg', language: 'es', alt: 'Una casa' }])
  })

  it('una celda que falta queda vacía', () => {
    expect(parseCsvRecords('filename,alt\na.jpg', ALIASES)).toEqual([
      { filename: 'a.jpg', alt: '' },
    ])
  })

  it('una columna con nombre de propiedad heredada no se resuelve a nada', () => {
    expect(
      parseCsvRecords('filename,constructor,toString\na.jpg,x,y', ALIASES),
    ).toEqual([{ filename: 'a.jpg' }])
  })

  it('sin filas, o solo con cabecera, no hay registros', () => {
    expect(parseCsvRecords('', ALIASES)).toEqual([])
    expect(parseCsvRecords('filename,alt', ALIASES)).toEqual([])
  })
})

describe('normalizeFilename', () => {
  it('no distingue mayúsculas', () => {
    expect(normalizeFilename('Foto.JPG')).toBe(normalizeFilename('foto.jpg'))
  })

  it('iguala la tilde compuesta (NFC) y la descompuesta (NFD) de macOS', () => {
    const nfc = 'café.jpg'.normalize('NFC')
    const nfd = 'café.jpg'.normalize('NFD')

    expect(nfc).not.toBe(nfd)
    expect(normalizeFilename(nfd)).toBe(normalizeFilename(nfc))
  })
})
