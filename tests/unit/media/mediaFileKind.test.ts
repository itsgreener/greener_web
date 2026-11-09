import { describe, expect, it } from 'vitest'

import {
  fileAcceptFor,
  isAllowedImageFile,
  isVideoFile,
  matchesMediaKind,
  VIDEO_FILE_ACCEPT,
} from '@/modules/media/client/mediaFileKind'
import { IMAGE_FILE_ACCEPT } from '@/modules/media/client/validateImageSelection'

const file = (name: string, type = '') => ({ name, type })

describe('isVideoFile', () => {
  it('reconoce el tipo MIME de vídeo', () => {
    expect(isVideoFile(file('clip', 'video/mp4'))).toBe(true)
  })

  it('reconoce mp4, webm, mov y m4v por extensión aunque el sistema no informe del tipo', () => {
    for (const name of ['a.mp4', 'a.WEBM', 'a.mov', 'a.m4v']) {
      expect(isVideoFile(file(name)), name).toBe(true)
    }
  })

  it('una imagen no es vídeo', () => {
    expect(isVideoFile(file('a.jpg', 'image/jpeg'))).toBe(false)
  })
})

describe('isAllowedImageFile', () => {
  it('admite JPG, PNG, WebP y AVIF por tipo MIME', () => {
    for (const type of [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
    ]) {
      expect(isAllowedImageFile(file('a', type)), type).toBe(true)
    }
  })

  it('sin tipo MIME decide la extensión', () => {
    expect(isAllowedImageFile(file('a.JPEG'))).toBe(true)
    expect(isAllowedImageFile(file('a.avif'))).toBe(true)
    expect(isAllowedImageFile(file('a.txt'))).toBe(false)
    expect(isAllowedImageFile(file('LEEME'))).toBe(false)
  })

  it('un GIF queda fuera, también con extensión engañosa', () => {
    expect(isAllowedImageFile(file('a.gif', 'image/gif'))).toBe(false)
    expect(isAllowedImageFile(file('a.png', 'image/gif'))).toBe(false)
  })

  it('un vídeo no es una imagen', () => {
    expect(isAllowedImageFile(file('a.mp4', 'video/mp4'))).toBe(false)
  })
})

describe('matchesMediaKind y fileAcceptFor', () => {
  it('cada tipo acepta lo suyo y rechaza lo del otro', () => {
    const photo = file('a.jpg', 'image/jpeg')
    const clip = file('a.mov', 'video/quicktime')

    expect(matchesMediaKind('image', photo)).toBe(true)
    expect(matchesMediaKind('image', clip)).toBe(false)
    expect(matchesMediaKind('video', clip)).toBe(true)
    expect(matchesMediaKind('video', photo)).toBe(false)
  })

  it('el accept del vídeo lleva respaldo por extensión', () => {
    expect(fileAcceptFor('video')).toBe(VIDEO_FILE_ACCEPT)
    expect(VIDEO_FILE_ACCEPT).toContain('.mov')
    expect(fileAcceptFor('image')).toBe(IMAGE_FILE_ACCEPT)
  })
})
