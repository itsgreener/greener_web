import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  CLOUDMERSIVE_MAX_FILE_BYTES,
  CLOUDMERSIVE_TIMEOUT_MS,
  scanFileForViruses,
  scanZipForViruses,
} from '@/modules/packages/infrastructure/cloudmersiveVirusScan'
import { VirusScanError } from '@/modules/packages/domain/packageErrors'

function fakeResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scanZipForViruses', () => {
  it('resuelve sin lanzar cuando CleanResult es true', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await expect(
      scanZipForViruses(Buffer.from('contenido')),
    ).resolves.toBeUndefined()
  })

  it('envía el ZIP como multipart a la URL de Cloudmersive con la Apikey', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await scanZipForViruses(Buffer.from('contenido'))

    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.cloudmersive.com/virus/scan/file')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Apikey).toBe(
      'test-cloudmersive-key',
    )
    expect(init?.body).toBeInstanceOf(FormData)
  })

  // SEC-ADM-C2: el comentario del servicio decía «tarda demasiado» pero nada lo cumplía.
  it('la petición lleva un tiempo máximo (AbortSignal)', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await scanZipForViruses(Buffer.from('contenido'))

    const [, init] = vi.mocked(fetch).mock.calls[0]

    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(CLOUDMERSIVE_TIMEOUT_MS).toBe(30_000)
  })

  it('si vence el tiempo máximo, la subida se rechaza (falla cerrado)', async () => {
    vi.mocked(fetch).mockRejectedValue(
      new DOMException('The operation timed out', 'TimeoutError'),
    )

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      'No se ha podido contactar con el servicio de escaneo antivirus.',
    )
  })

  it('lanza VirusScanError con los nombres de virus si CleanResult es false', async () => {
    vi.mocked(fetch).mockResolvedValue(
      fakeResponse({
        CleanResult: false,
        FoundViruses: [{ FileName: 'main.js', VirusName: 'EICAR-Test-File' }],
      }),
    )

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      /EICAR-Test-File/,
    )
  })

  it('lanza VirusScanError si CleanResult es false sin detalle de virus', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: false }))

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('lanza VirusScanError si la respuesta HTTP no es ok (servicio caído/límite alcanzado)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      fakeResponse({}, { ok: false, status: 503 }),
    )

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('lanza VirusScanError si fetch falla (sin red) — bloqueante, no se traga el error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('lanza VirusScanError si la respuesta no es JSON válido', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('CleanResult ausente (no true, no false) también se trata como no confirmado limpio — nunca se abre en fallo', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({}))

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })
})

describe('scanFileForViruses (CVs de talent y cualquier otro fichero)', () => {
  it('manda el fichero con el nombre que se le indica', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await scanFileForViruses(Buffer.from('contenido'), 'cv.pdf')

    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData
    const file = body.get('inputFile') as File

    expect(file.name).toBe('cv.pdf')
  })

  it('el ZIP sigue mandándose como package.zip', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await scanZipForViruses(Buffer.from('contenido'))

    const body = vi.mocked(fetch).mock.calls[0][1]?.body as FormData

    expect((body.get('inputFile') as File).name).toBe('package.zip')
  })

  it('un fichero que supera el tope se rechaza sin enviarlo, con el texto que corresponde', async () => {
    const big = Buffer.alloc(CLOUDMERSIVE_MAX_FILE_BYTES + 1)

    await expect(scanFileForViruses(big, 'cv.pdf')).rejects.toThrow(
      /El archivo supera/,
    )
    await expect(scanZipForViruses(big)).rejects.toThrow(/El ZIP supera/)
    expect(fetch).not.toHaveBeenCalled()
  })
})
