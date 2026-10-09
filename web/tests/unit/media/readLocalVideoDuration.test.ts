// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  LOCAL_DURATION_TIMEOUT_MS,
  readLocalVideoDuration,
} from '@/modules/media/infrastructure/readLocalVideoDuration'

type FakeVideo = {
  preload: string
  duration: number
  onloadedmetadata: (() => void) | null
  onerror: (() => void) | null
  src: string
}

let video: FakeVideo
let revoke: ReturnType<typeof vi.fn>

// jsdom no decodifica vídeo: se sustituye createElement solo para 'video'
// y cada test decide qué ocurre al asignar `src`.
function mockVideo(onSrc: (el: FakeVideo) => void, duration = Number.NaN) {
  const real = document.createElement.bind(document)

  vi.spyOn(document, 'createElement').mockImplementation(
    (tag: string, ...rest: unknown[]) => {
      if (tag !== 'video') {
        // @ts-expect-error -- passthrough
        return real(tag, ...rest)
      }

      video = {
        preload: '',
        duration,
        onloadedmetadata: null,
        onerror: null,
        set src(_v: string) {
          onSrc(video)
        },
      } as unknown as FakeVideo

      return video as unknown as HTMLVideoElement
    },
  )
}

const FILE = new File(['x'], 'demo.webm', { type: 'video/webm' })

beforeEach(() => {
  revoke = vi.fn()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: revoke,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('readLocalVideoDuration (5 oct 2026)', () => {
  it('devuelve la duración cuando el navegador la da', async () => {
    mockVideo((el) => queueMicrotask(() => el.onloadedmetadata?.()), 5.2)

    expect(await readLocalVideoDuration(FILE)).toBe(5.2)
  })

  it.each([
    [
      'Infinity (WebM de MediaRecorder / grabador de pantalla, sin cabecera de duración)',
      Infinity,
    ],
    ['-Infinity', -Infinity],
    ['NaN', Number.NaN],
    ['0', 0],
    ['negativa', -3],
  ])(
    'una duración no fiable (%s) cuenta como «no se sabe» (null), no como vídeo larguísimo',
    async (_label, duration) => {
      mockVideo((el) => queueMicrotask(() => el.onloadedmetadata?.()), duration)

      expect(await readLocalVideoDuration(FILE)).toBeNull()
    },
  )

  it('un vídeo que el navegador no puede decodificar (.mov HEVC) devuelve null, no lanza', async () => {
    mockVideo((el) => queueMicrotask(() => el.onerror?.()))

    expect(await readLocalVideoDuration(FILE)).toBeNull()
  })

  it('si el navegador no responde nunca, devuelve null tras el tiempo máximo en vez de colgar el formulario', async () => {
    vi.useFakeTimers()
    mockVideo(() => {})

    const promise = readLocalVideoDuration(FILE)

    await vi.advanceTimersByTimeAsync(LOCAL_DURATION_TIMEOUT_MS + 1)

    expect(await promise).toBeNull()
  })

  it('libera la URL del archivo en todos los casos', async () => {
    mockVideo((el) => queueMicrotask(() => el.onloadedmetadata?.()), 4)
    await readLocalVideoDuration(FILE)
    expect(revoke).toHaveBeenCalledWith('blob:mock')

    revoke.mockClear()
    vi.restoreAllMocks()
    mockVideo((el) => queueMicrotask(() => el.onerror?.()))
    await readLocalVideoDuration(FILE)
    expect(revoke).toHaveBeenCalledWith('blob:mock')
  })

  it('un evento tardío tras resolver no hace nada (no resuelve dos veces ni lanza)', async () => {
    mockVideo((el) => queueMicrotask(() => el.onloadedmetadata?.()), 6)

    expect(await readLocalVideoDuration(FILE)).toBe(6)
    expect(video.onloadedmetadata).toBeNull()
    expect(video.onerror).toBeNull()
  })
})
