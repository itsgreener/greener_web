import { describe, expect, it } from 'vitest'

import { readImageInfo } from '@/modules/packages/domain/imageDimensions'
import { jpegBytes, pngBytes, webpBytes } from '@tests/helpers/packageFixtures'

describe('readImageInfo', () => {
  it('lee las medidas de un PNG', () => {
    expect(readImageInfo(pngBytes(1200, 630))).toEqual({
      format: 'png',
      width: 1200,
      height: 630,
    })
  })

  it('lee las medidas de un JPEG saltándose los segmentos previos al SOF', () => {
    expect(readImageInfo(jpegBytes(1910, 1000))).toEqual({
      format: 'jpeg',
      width: 1910,
      height: 1000,
    })
  })

  it.each(['lossy', 'lossless', 'extended'] as const)(
    'lee las medidas de un WebP %s',
    (kind) => {
      expect(readImageInfo(webpBytes(kind, 1600, 840))).toEqual({
        format: 'webp',
        width: 1600,
        height: 840,
      })
    },
  )

  it('devuelve null para bytes que no son una imagen reconocida', () => {
    expect(
      readImageInfo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBeNull()
    expect(readImageInfo(Buffer.alloc(0))).toBeNull()
    expect(readImageInfo(Buffer.from('GIF89a'))).toBeNull()
  })

  it('devuelve null para una imagen truncada antes de sus medidas', () => {
    expect(readImageInfo(pngBytes().subarray(0, 18))).toBeNull()
    expect(readImageInfo(jpegBytes().subarray(0, 12))).toBeNull()
    expect(readImageInfo(webpBytes('lossy').subarray(0, 20))).toBeNull()
  })

  it('devuelve null si las medidas son cero', () => {
    expect(readImageInfo(pngBytes(0, 630))).toBeNull()
  })
})
