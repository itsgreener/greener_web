import { beforeEach, describe, expect, it, vi } from 'vitest'

const readLocalVideoDuration = vi.fn()

vi.mock('@/modules/media/client/readLocalVideoDuration', () => ({
  readLocalVideoDuration: (...args: unknown[]) =>
    readLocalVideoDuration(...args),
}))

import {
  assertLocalVideoWithinLimits,
  assertUploadedVideoWithinLimits,
  contentVideoRules,
  pinVideoRules,
} from '@/modules/media/client/videoUploadChecks'

const MB = 1024 * 1024

function file(sizeBytes: number): File {
  return { size: sizeBytes, name: 'v.mp4', type: 'video/mp4' } as File
}

beforeEach(() => {
  readLocalVideoDuration.mockReset()
})

describe('assertLocalVideoWithinLimits', () => {
  it('con duración legible dentro de límites, no lanza', async () => {
    readLocalVideoDuration.mockResolvedValue(5)

    await expect(
      assertLocalVideoWithinLimits(file(MB), pinVideoRules('case')),
    ).resolves.toBeUndefined()
  })

  it('pin que no es de tool: 12 s se rechaza (límite 8 s)', async () => {
    readLocalVideoDuration.mockResolvedValue(12)

    await expect(
      assertLocalVideoWithinLimits(file(MB), pinVideoRules('case')),
    ).rejects.toThrow('El vídeo no puede superar los 8 segundos.')
  })

  it('pin de tool: 12 s se admite (límite 15 s)', async () => {
    readLocalVideoDuration.mockResolvedValue(12)

    await expect(
      assertLocalVideoWithinLimits(file(MB), pinVideoRules('tool')),
    ).resolves.toBeUndefined()
  })

  it('vídeo de contenido: más de 180 s se rechaza', async () => {
    readLocalVideoDuration.mockResolvedValue(200)

    await expect(
      assertLocalVideoWithinLimits(file(MB), contentVideoRules('x')),
    ).rejects.toThrow('El vídeo no puede superar los 180 segundos.')
  })

  it('demasiado pesado, con duración legible', async () => {
    readLocalVideoDuration.mockResolvedValue(5)

    await expect(
      assertLocalVideoWithinLimits(file(16 * MB), pinVideoRules('tool')),
    ).rejects.toThrow('El vídeo supera los 15 MB.')
  })

  it('sin duración legible (null) no bloquea si el tamaño cabe', async () => {
    readLocalVideoDuration.mockResolvedValue(null)

    await expect(
      assertLocalVideoWithinLimits(file(MB), pinVideoRules('case')),
    ).resolves.toBeUndefined()
  })

  it('sin duración legible (null) solo valida el tamaño', async () => {
    readLocalVideoDuration.mockResolvedValue(null)

    await expect(
      assertLocalVideoWithinLimits(file(16 * MB), pinVideoRules('tool')),
    ).rejects.toThrow('El vídeo supera los 15 MB.')
  })
})

describe('assertUploadedVideoWithinLimits', () => {
  it('dentro de límites, no lanza', () => {
    expect(() =>
      assertUploadedVideoWithinLimits(
        { bytes: MB, duration: 5 },
        pinVideoRules('case'),
      ),
    ).not.toThrow()
  })

  it('duración real excesiva en un pin: mensaje con «para un pin» y la nota de descarte', () => {
    expect(() =>
      assertUploadedVideoWithinLimits(
        { bytes: MB, duration: 20 },
        pinVideoRules('tool'),
      ),
    ).toThrow(
      'El vídeo dura más de los 15 segundos permitidos para un pin (el archivo subido se ha descartado y no se ha guardado).',
    )
  })

  it('duración real excesiva en un contenido: la nota la pone quien llama', () => {
    expect(() =>
      assertUploadedVideoWithinLimits(
        { bytes: MB, duration: 200 },
        contentVideoRules(
          'el archivo subido se ha descartado y la portada anterior no se ha tocado',
        ),
      ),
    ).toThrow(
      'El vídeo dura más de los 180 segundos permitidos (el archivo subido se ha descartado y la portada anterior no se ha tocado).',
    )
  })

  it('peso real excesivo', () => {
    expect(() =>
      assertUploadedVideoWithinLimits(
        { bytes: 101 * MB, duration: 5 },
        contentVideoRules('nota'),
      ),
    ).toThrow('El vídeo supera los 100 MB (nota).')
  })
})
