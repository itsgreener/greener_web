import { describe, expect, it } from 'vitest'

import {
  applyCsvToRows,
  buildRows,
  describeCsvIssues,
  listNames,
  type SlideRow,
} from '@/app/admin/(panel)/contents/[id]/edit/CaseCarouselManager/rows'
import { parseCarouselCsv } from '@/modules/content/domain/caseCarouselCsv'

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' })
const csv = (text: string) => parseCarouselCsv(text)

describe('buildRows', () => {
  it('ordena por nombre natural y numera la clave por posición', () => {
    const rows = buildRows(
      [file('slide-10.jpg'), file('slide-2.jpg'), file('slide-1.jpg')],
      [],
    )

    expect(rows.map((row) => row.file.name)).toEqual([
      'slide-1.jpg',
      'slide-2.jpg',
      'slide-10.jpg',
    ])
    expect(rows.map((row) => row.key)).toEqual([
      '0-slide-1.jpg',
      '1-slide-2.jpg',
      '2-slide-10.jpg',
    ])
    expect(rows.every((row) => row.status === 'pending')).toBe(true)
  })

  it('sin CSV el alt queda vacío: no se inventa uno con el nombre del archivo', () => {
    const [row] = buildRows([file('slide-1.jpg')], [])

    expect(row.alt).toBe('')
    expect(row.altSource).toBe('none')
  })

  it('el alt sale del CSV, recortado, y se marca como tal', () => {
    const [row] = buildRows(
      [file('slide-1.jpg')],
      csv('filename,alt\nslide-1.jpg,  An orchard  '),
    )

    expect(row.alt).toBe('An orchard')
    expect(row.altSource).toBe('csv')
  })

  it('una fila de CSV sin alt cuenta como sin alt', () => {
    const [row] = buildRows(
      [file('slide-1.jpg')],
      csv('filename,alt\nslide-1.jpg,'),
    )

    expect(row.alt).toBe('')
    expect(row.altSource).toBe('none')
  })

  it('dos archivos con el mismo nombre no comparten clave', () => {
    const rows = buildRows([file('a.jpg'), file('a.jpg')], [])

    expect(new Set(rows.map((row) => row.key)).size).toBe(2)
  })
})

describe('applyCsvToRows', () => {
  function rows(): SlideRow[] {
    return buildRows([file('a.jpg'), file('b.jpg'), file('c.jpg')], [])
  }

  it('rellena el alt de las filas que no lo tenían', () => {
    const next = applyCsvToRows(rows(), csv('filename,alt\na.jpg,A\nb.jpg,B'))

    expect(next.map((row) => row.alt)).toEqual(['A', 'B', ''])
    expect(next.map((row) => row.altSource)).toEqual(['csv', 'csv', 'none'])
  })

  it('respeta lo escrito a mano', () => {
    const base = rows()

    base[0] = { ...base[0], alt: 'Mío', altSource: 'manual' }

    expect(
      applyCsvToRows(base, csv('filename,alt\na.jpg,Del CSV'))[0],
    ).toMatchObject({ alt: 'Mío', altSource: 'manual' })
  })

  it('respeta las filas ya subidas y las que se están subiendo', () => {
    const base = rows()

    base[0] = { ...base[0], alt: 'Subida', altSource: 'csv', status: 'ok' }
    base[1] = {
      ...base[1],
      alt: 'En curso',
      altSource: 'csv',
      status: 'uploading',
    }

    const next = applyCsvToRows(base, csv('filename,alt\na.jpg,X\nb.jpg,Y'))

    expect(next[0].alt).toBe('Subida')
    expect(next[1].alt).toBe('En curso')
  })

  it('sustituye el alt de un CSV anterior por el del nuevo', () => {
    const first = applyCsvToRows(rows(), csv('filename,alt\na.jpg,Viejo'))
    const second = applyCsvToRows(first, csv('filename,alt\na.jpg,Nuevo'))

    expect(second[0].alt).toBe('Nuevo')
  })

  it('quitar el CSV vacía los alt que venían de él, pero no los manuales', () => {
    const first = applyCsvToRows(rows(), csv('filename,alt\na.jpg,A\nb.jpg,B'))

    first[1] = { ...first[1], alt: 'Mío', altSource: 'manual' }

    const cleared = applyCsvToRows(first, [])

    expect(cleared.map((row) => row.alt)).toEqual(['', 'Mío', ''])
  })

  it('un error previo se conserva para poder reintentar', () => {
    const base = rows()

    base[0] = { ...base[0], status: 'error', error: 'Falló' }

    expect(applyCsvToRows(base, csv('filename,alt\na.jpg,A'))[0]).toMatchObject(
      { status: 'error', error: 'Falló', alt: 'A' },
    )
  })
})

describe('listNames', () => {
  it('enumera hasta el límite sin resumir', () => {
    expect(listNames(['a', 'b'])).toBe('a, b')
    expect(listNames(['a', 'b', 'c', 'd', 'e'])).toBe('a, b, c, d, e')
  })

  it('con más del límite resume el resto', () => {
    expect(listNames(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toBe(
      'a, b, c, d, e y 2 más',
    )
  })
})

describe('describeCsvIssues', () => {
  it('un CSV sin filas válidas avisa y no compara nada más', () => {
    expect(describeCsvIssues([], ['a.jpg'])).toEqual([
      'El CSV no contiene ninguna fila válida: la primera línea debe incluir la columna filename.',
    ])
  })

  it('un CSV sin columna alt lo dice', () => {
    expect(describeCsvIssues(csv('filename\na.jpg'), ['a.jpg'])).toEqual([
      'El CSV no trae la columna alt.',
    ])
  })

  it('avisa de filas sin archivo y de archivos sin fila', () => {
    const issues = describeCsvIssues(csv('filename,alt\na.jpg,A\ntypo.jpg,T'), [
      'a.jpg',
      'b.jpg',
    ])

    expect(issues).toEqual([
      'El CSV tiene 1 fila sin archivo en la selección: typo.jpg.',
      '1 archivo no aparece en el CSV: b.jpg. Escribe su alt en la tabla.',
    ])
  })

  it('usa el plural cuando toca', () => {
    const issues = describeCsvIssues(csv('filename,alt\nx.jpg,X\ny.jpg,Y'), [
      'a.jpg',
      'b.jpg',
    ])

    expect(issues[0]).toContain('2 filas sin archivo')
    expect(issues[1]).toContain('2 archivos no aparecen en el CSV')
  })

  it('sin archivos elegidos no hay con qué comparar', () => {
    expect(describeCsvIssues(csv('filename,alt\na.jpg,A'), [])).toEqual([])
  })

  it('todo encaja: sin avisos', () => {
    expect(describeCsvIssues(csv('filename,alt\na.jpg,A'), ['A.JPG'])).toEqual(
      [],
    )
  })
})
