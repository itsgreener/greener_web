import { describe, expect, it } from 'vitest'

import { codeOf, sourceFiles } from '@tests/helpers/sourceFiles'

/**
 * `components/media/CloudinaryImage` es el único `<img>` de Cloudinary con
 * escalera de anchos (auditoría TSX, PUB-A1). Fuera de él solo quedan dos
 * `<img>` a propósito: el póster superpuesto de `ToolCoverVideo` y el logo
 * SVG del Shell. Una excepción nueva debe pasar por aquí, no colarse.
 */
const ALLOWED = [
  'src/components/media/CloudinaryImage/index.tsx',
  'src/components/detail/ToolCoverVideo/index.tsx',
  'src/components/shell/Shell/index.tsx',
]

const IMG_TAG = /<img[\s/>]/

describe('un solo <img> de Cloudinary', () => {
  const files = sourceFiles('src')
  const withImg = files.filter(
    (file) => file.endsWith('.tsx') && IMG_TAG.test(codeOf(file)),
  )

  it('el detector reconoce un <img>', () => {
    expect('<img src={x} alt="" />').toMatch(IMG_TAG)
    expect('<imgFoo />').not.toMatch(IMG_TAG)
  })

  it('solo las excepciones conocidas pintan un <img>', () => {
    expect(withImg.filter((file) => !ALLOWED.includes(file))).toEqual([])
  })

  it('cada excepción sigue usando un <img> (si no, sobra de la lista)', () => {
    expect(ALLOWED.filter((file) => !withImg.includes(file))).toEqual([])
  })
})
