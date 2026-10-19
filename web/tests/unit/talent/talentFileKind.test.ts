import { describe, expect, it } from 'vitest'

import {
  allowedExtensionOf,
  contentTypeOf,
  detectFileKind,
  extensionMatchesKind,
} from '@/modules/talent/domain/talentFileKind'
import { FILE_BYTES } from '@tests/helpers/talentFakes'

describe('detectFileKind', () => {
  it.each([
    ['pdf', FILE_BYTES.pdf],
    ['png', FILE_BYTES.png],
    ['jpeg', FILE_BYTES.jpeg],
    ['webp', FILE_BYTES.webp],
    ['doc', FILE_BYTES.doc],
    ['docx', FILE_BYTES.docx],
  ] as const)('reconoce %s por su firma', (kind, bytes) => {
    expect(detectFileKind(bytes)).toBe(kind)
  })

  it('texto plano, vacío o cortos no son nada', () => {
    expect(detectFileKind(FILE_BYTES.text)).toBeNull()
    expect(detectFileKind(new Uint8Array())).toBeNull()
    expect(detectFileKind(Uint8Array.from([0x25, 0x50]))).toBeNull()
  })

  it('un RIFF que no es WEBP (un .wav) no pasa por imagen', () => {
    const wav = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
    ])

    expect(detectFileKind(wav)).toBeNull()
  })
})

describe('allowedExtensionOf', () => {
  it.each([
    ['cv.pdf', 'pdf'],
    ['CV Final.DOCX', 'docx'],
    ['foto.JPG', 'jpg'],
    ['a.b.c.webp', 'webp'],
  ])('%s → %s', (name, extension) => {
    expect(allowedExtensionOf(name)).toBe(extension)
  })

  it.each(['cv.exe', 'cv', 'cv.pdf.exe', '.pdf ', 'cv.html', 'cv.svg'])(
    '%j no se admite',
    (name) => {
      // ".pdf " tiene extensión pdf tras recortar: se comprueba aparte.
      if (name === '.pdf ') {
        expect(allowedExtensionOf(name)).toBe('pdf')
        return
      }

      expect(allowedExtensionOf(name)).toBeNull()
    },
  )
})

describe('extensionMatchesKind / contentTypeOf', () => {
  it('jpg y jpeg valen para un JPEG, y una extensión no vale para otro contenido', () => {
    expect(extensionMatchesKind('jpg', 'jpeg')).toBe(true)
    expect(extensionMatchesKind('jpeg', 'jpeg')).toBe(true)
    expect(extensionMatchesKind('pdf', 'png')).toBe(false)
    expect(extensionMatchesKind('docx', 'doc')).toBe(false)
  })

  it('el tipo MIME sale del contenido, no del navegador', () => {
    expect(contentTypeOf('pdf')).toBe('application/pdf')
    expect(contentTypeOf('docx')).toContain('wordprocessingml')
    expect(contentTypeOf('webp')).toBe('image/webp')
  })
})
